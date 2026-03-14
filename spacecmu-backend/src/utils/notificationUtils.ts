import { dbClient } from "../../db/client.js";
import { notificationsTable, usersTable } from "../../db/schema.js";
import { and, eq, gt, sql, inArray } from "drizzle-orm";

/** ระยะเวลา cooldown (มิลลิวินาที) ป้องกัน notification spam */
const NOTIFICATION_COOLDOWN_MS = 30_000; // 30 วินาที

type NotificationType =
    | "like"
    | "comment"
    | "friend_request"
    | "other"
    | "repost"
    | "reply"
    | "comment_like"
    | "friend_accept"
    | "mention";

/**
 * สร้าง notification เฉพาะเมื่อยังไม่มี notification ซ้ำใน cooldown window
 * ป้องกัน spam เช่น like/repost/comment ซ้ำๆ ในเวลาสั้นๆ
 */
export async function createNotificationIfNotDuplicate({
    recipientId,
    senderId,
    type,
    referenceId,
    message,
}: {
    recipientId: string;
    senderId: string;
    type: NotificationType | string;
    referenceId: string | null;
    message: string | null;
}): Promise<void> {
    // ไม่แจ้งเตือนตัวเอง
    if (recipientId === senderId) return;

    const cutoff = new Date(Date.now() - NOTIFICATION_COOLDOWN_MS);

    const existing = await dbClient
        .select({ id: notificationsTable.id })
        .from(notificationsTable)
        .where(
            and(
                eq(notificationsTable.recipientId, recipientId),
                eq(notificationsTable.senderId, senderId),
                eq(notificationsTable.type, type as NotificationType),
                referenceId
                    ? eq(notificationsTable.referenceId, referenceId)
                    : sql`true`,
                gt(notificationsTable.createdAt, cutoff)
            )
        )
        .limit(1);

    if (existing.length > 0) {
        // มี notification เดิมอยู่ใน cooldown — ข้าม
        return;
    }

    await dbClient.insert(notificationsTable).values({
        recipientId,
        senderId,
        type: type as NotificationType,
        referenceId,
        message,
    });
}

/**
 * Replace @[userId] tokens in text with real display names.
 * Used to clean up notification preview messages so they show "@ชื่อ" instead of "@[uuid]".
 */
export async function resolveMentionsInText(text: string): Promise<string> {
    const mentionRegex = /@\[([^\]]+)\]/g;
    const ids = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = mentionRegex.exec(text)) !== null) ids.add(m[1].trim());
    if (ids.size === 0) return text;

    const users = await dbClient
        .select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName })
        .from(usersTable)
        .where(inArray(usersTable.id, Array.from(ids)));

    const nameMap = new Map(users.map(u => [u.id, `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()]));
    return text.replace(/@\[([^\]]+)\]/g, (_m, uid) => {
        const name = nameMap.get(uid.trim());
        return name ? `@${name}` : "@someone";
    });
}

/**
 * Parse @userId tags from text and send "mention" notifications.
 * Frontend encodes mentions as @[userId] in the raw text stored in DB.
 *
 * @param text        - raw comment/post content
 * @param senderId    - the user who wrote the text
 * @param referenceId - the postId the mention belongs to (for "View Post" link)
 * @param sourceType  - "post" (default) or "comment" — determines the notification prefix
 */
export async function sendMentionNotifications({
    text,
    senderId,
    referenceId,
    sourceType = "post",
}: {
    text: string;
    senderId: string;
    referenceId: string;
    sourceType?: "post" | "comment";
}): Promise<void> {
    // Mentions are encoded as @[userId] by the frontend
    const mentionRegex = /@\[([^\]]+)\]/g;
    const mentionedIds = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = mentionRegex.exec(text)) !== null) {
        const uid = match[1].trim();
        if (uid && uid !== senderId) {
            mentionedIds.add(uid);
        }
    }

    if (mentionedIds.size === 0) return;

    // Fetch all mentioned users at once (verify they exist + get their names)
    const existing = await dbClient
        .select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName })
        .from(usersTable)
        .where(inArray(usersTable.id, Array.from(mentionedIds)));

    // Build a name map for substitution
    const nameMap = new Map(existing.map(u => [u.id, `${u.firstName} ${u.lastName}`.trim()]));
    const validIds = existing.map(u => u.id);

    // Build a clean message with real names substituted
    const previewText = text
        .replace(/@\[([^\]]+)\]/g, (_m, uid) => {
            const name = nameMap.get(uid.trim());
            return name ? `@${name}` : "@someone";
        })
        .trim()
        .substring(0, 120);

    // Prefix message with source type so frontend can render correct label
    const cleanMessage = `[src:${sourceType}]${previewText}`;

    for (const recipientId of validIds) {
        await createNotificationIfNotDuplicate({
            recipientId,
            senderId,
            type: "mention",
            referenceId,
            message: cleanMessage || null,
        });
    }
}
