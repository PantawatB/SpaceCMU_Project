import { dbClient } from "../../db/client.js";
import { notificationsTable } from "../../db/schema.js";
import { and, eq, gt, sql } from "drizzle-orm";

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
    | "friend_accept";

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
