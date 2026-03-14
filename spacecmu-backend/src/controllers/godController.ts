import type { Request, Response } from "express";
import { dbClient } from "../../db/client.js";
import { usersTable, postsTable, sessionsTable, activitiesTable, officialAccountsTable, officialAccountAdminsTable, notificationsTable } from "../../db/schema.js";
import { eq, count, sql, desc, and, ilike, or, inArray } from "drizzle-orm";

/**
 * Helper: ถ้า user (role === "admin") ไม่มี official account ที่ตัวเองเป็น admin อีกแล้ว
 * ให้ downgrade role กลับเป็น "user" อัตโนมัติ
 * (ไม่แตะ god)
 */
async function downgradeIfNoOfficialAccounts(userId: string): Promise<void> {
    const [user] = await dbClient
        .select({ role: usersTable.role })
        .from(usersTable)
        .where(eq(usersTable.id, userId));

    if (!user || user.role !== "admin") return;

    const [remaining] = await dbClient
        .select({ count: count() })
        .from(officialAccountAdminsTable)
        .where(eq(officialAccountAdminsTable.adminUserId, userId));

    if (Number(remaining?.count ?? 0) === 0) {
        await dbClient
            .update(usersTable)
            .set({ role: "user" })
            .where(eq(usersTable.id, userId));
    }
}

/** GET /api/god/stats — platform-wide overview */
export const getPlatformStats = async (req: Request, res: Response) => {
    try {
        const [totalUsers] = await dbClient
            .select({ count: count() })
            .from(usersTable)
            .where(eq(usersTable.isAnonymous, false));

        const [totalAdmins] = await dbClient
            .select({ count: count() })
            .from(usersTable)
            .where(and(eq(usersTable.role, "admin"), eq(usersTable.isAnonymous, false)));

        const [totalBanned] = await dbClient
            .select({ count: count() })
            .from(usersTable)
            .where(eq(usersTable.status, "banned"));

        const [totalPosts] = await dbClient
            .select({ count: count() })
            .from(postsTable);

        const [activeSessions] = await dbClient
            .select({ count: sql<number>`count(distinct ${sessionsTable.activeUserId})` })
            .from(sessionsTable);

        res.json({
            totalUsers: totalUsers?.count ?? 0,
            totalAdmins: totalAdmins?.count ?? 0,
            totalBanned: totalBanned?.count ?? 0,
            totalPosts: totalPosts?.count ?? 0,
            activeSessions: activeSessions?.count ?? 0,
        });
    } catch (error) {
        console.error("God stats error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/** GET /api/god/users — all users with role info (including anonymous accounts) */
export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await dbClient
            .select({
                id: usersTable.id,
                firstName: usersTable.firstName,
                lastName: usersTable.lastName,
                username: usersTable.username,
                email: usersTable.email,
                role: usersTable.role,
                status: usersTable.status,
                isAnonymous: usersTable.isAnonymous,
                parentUserId: usersTable.parentUserId,
                createdAt: usersTable.createdAt,
                lastActiveAt: usersTable.lastActiveAt,
            })
            .from(usersTable)
            .orderBy(desc(usersTable.createdAt));

        res.json(users);
    } catch (error) {
        console.error("God getAllUsers error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/** PATCH /api/god/users/:userId/role — promote/demote a user's role */
export const setUserRole = async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { role } = req.body;

    const allowed = ["user", "admin"];
    if (!allowed.includes(role)) {
        return res.status(400).json({ message: "Invalid role. Allowed: user, admin" });
    }

    try {
        // ถ้าจะ demote เป็น "user" ให้ตรวจก่อนว่ายังมี official account ที่ manage อยู่ไหม
        if (role === "user") {
            const [remaining] = await dbClient
                .select({ count: count() })
                .from(officialAccountAdminsTable)
                .where(eq(officialAccountAdminsTable.adminUserId, userId));

            if (Number(remaining?.count ?? 0) > 0) {
                return res.status(400).json({
                    message: "Cannot demote to user: this user still manages official account(s). Remove them from all official accounts first.",
                });
            }
        }

        const [updated] = await dbClient
            .update(usersTable)
            .set({ role })
            .where(eq(usersTable.id, userId))
            .returning({ id: usersTable.id, role: usersTable.role });

        if (!updated) return res.status(404).json({ message: "User not found" });

        res.json({ message: `Role updated to ${role}`, user: updated });
    } catch (error) {
        console.error("God setUserRole error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/** PATCH /api/god/users/:userId/status — ban/unban any user */
export const setUserStatus = async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { status } = req.body;

    const allowed = ["active", "banned"];
    if (!allowed.includes(status)) {
        return res.status(400).json({ message: "Invalid status. Allowed: active, banned" });
    }

    try {
        const [updated] = await dbClient
            .update(usersTable)
            .set({ status })
            .where(eq(usersTable.id, userId))
            .returning({ id: usersTable.id, status: usersTable.status });

        if (!updated) return res.status(404).json({ message: "User not found" });

        res.json({ message: `Status updated to ${status}`, user: updated });
    } catch (error) {
        console.error("God setUserStatus error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/** GET /api/god/activities — full activity log */
export const getFullActivityLog = async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    try {
        const [logs, totalRow] = await Promise.all([
            dbClient
                .select({
                    id: activitiesTable.id,
                    action: activitiesTable.action,
                    details: activitiesTable.details,
                    ipAddress: activitiesTable.ipAddress,
                    createdAt: activitiesTable.createdAt,
                    user: {
                        id: usersTable.id,
                        firstName: usersTable.firstName,
                        lastName: usersTable.lastName,
                        email: usersTable.email,
                        role: usersTable.role,
                    },
                })
                .from(activitiesTable)
                .leftJoin(usersTable, eq(activitiesTable.userId, usersTable.id))
                .orderBy(desc(activitiesTable.createdAt))
                .limit(limit)
                .offset(offset),
            dbClient.select({ total: count() }).from(activitiesTable),
        ]);

        const total = totalRow[0]?.total ?? 0;
        res.json({
            data: logs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasMore: offset + limit < total,
            },
        });
    } catch (error) {
        console.error("God getFullActivityLog error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * POST /api/god/official-accounts
 * สร้าง official account ใหม่ พร้อมกำหนด owner (admin คนแรก)
 * Body: { name, username, faculty, ownerUserId }
 */
export const createOfficialAccount = async (req: Request, res: Response) => {
    const { name, username, faculty, ownerUserId } = req.body;

    if (!name?.trim() || !username?.trim() || !faculty?.trim() || !ownerUserId) {
        return res.status(400).json({ message: "name, username, faculty, ownerUserId are required" });
    }

    // ห้ามเลือก god เป็น owner
    const [ownerUser] = await dbClient
        .select({ id: usersTable.id, role: usersTable.role })
        .from(usersTable)
        .where(eq(usersTable.id, ownerUserId));

    if (!ownerUser) return res.status(404).json({ message: "Owner user not found" });
    if (ownerUser.role === "official_account") return res.status(400).json({ message: "Cannot assign official_account as owner" });

    try {
        // 1. สร้าง user record สำหรับ official account (ไม่มี password — login ไม่ได้โดยตรง)
        const safeUsername = username.trim().toLowerCase().replace(/\s/g, "_");
        const fakeEmail = `official_${safeUsername}_${Date.now()}@spacecmu.internal`;

        const [officialUser] = await dbClient
            .insert(usersTable)
            .values({
                firstName: name.trim(),
                lastName: "",
                username: safeUsername,
                email: fakeEmail,
                faculty: faculty.trim(),
                role: "official_account",
                status: "active",
                isAnonymous: false,
            })
            .returning({ id: usersTable.id });

        // 2. สร้าง official_accounts record
        const [officialAccount] = await dbClient
            .insert(officialAccountsTable)
            .values({
                userId: officialUser.id,
                name: name.trim(),
                username: safeUsername,
                faculty: faculty.trim(),
                ownerId: ownerUserId,
            })
            .returning();

        // 3. Update role ของ owner → admin (ถ้ายังไม่ใช่ admin/god)
        if (ownerUser.role === "user") {
            await dbClient
                .update(usersTable)
                .set({ role: "admin" })
                .where(eq(usersTable.id, ownerUserId));
        }

        // 4. Insert เข้า junction table
        await dbClient
            .insert(officialAccountAdminsTable)
            .values({
                officialAccountId: officialAccount.id,
                adminUserId: ownerUserId,
            });

        res.status(201).json({
            message: `Official account @${safeUsername} created successfully`,
            officialAccount,
        });
    } catch (error: unknown) {
        if (
            error instanceof Error &&
            (error.message.includes("unique") || error.message.includes("duplicate"))
        ) {
            return res.status(409).json({ message: "Username already taken" });
        }
        console.error("createOfficialAccount error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * GET /api/god/official-accounts
 * ดูรายการ official accounts ทั้งหมด พร้อม owner และรายชื่อ admins
 */
export const getOfficialAccounts = async (req: Request, res: Response) => {
    try {
        const accounts = await dbClient
            .select({
                id: officialAccountsTable.id,
                name: officialAccountsTable.name,
                username: officialAccountsTable.username,
                faculty: officialAccountsTable.faculty,
                createdAt: officialAccountsTable.createdAt,
                userId: officialAccountsTable.userId,
                // avatarUrl ของ official account เอง (join ผ่าน userId)
                avatarUrl: sql<string | null>`(
                    SELECT u2.avatar_url FROM users u2
                    WHERE u2.id = ${officialAccountsTable.userId}
                    LIMIT 1
                )`,
                owner: {
                    id: usersTable.id,
                    firstName: usersTable.firstName,
                    lastName: usersTable.lastName,
                    username: usersTable.username,
                    email: usersTable.email,
                },
            })
            .from(officialAccountsTable)
            .leftJoin(usersTable, eq(officialAccountsTable.ownerId, usersTable.id))
            .orderBy(desc(officialAccountsTable.createdAt));

        // ดึง admins ของแต่ละ account
        const accountIds = accounts.map((a) => a.id);
        const admins =
            accountIds.length > 0
                ? await dbClient
                      .select({
                          officialAccountId: officialAccountAdminsTable.officialAccountId,
                          grantedAt: officialAccountAdminsTable.grantedAt,
                          admin: {
                              id: usersTable.id,
                              firstName: usersTable.firstName,
                              lastName: usersTable.lastName,
                              username: usersTable.username,
                              email: usersTable.email,
                              role: usersTable.role,
                          },
                      })
                      .from(officialAccountAdminsTable)
                      .leftJoin(usersTable, eq(officialAccountAdminsTable.adminUserId, usersTable.id))
                : [];

        // Group admins by officialAccountId
        const adminsByAccount = admins.reduce<Record<string, typeof admins>>((acc, row) => {
            const key = row.officialAccountId;
            if (!acc[key]) acc[key] = [];
            acc[key].push(row);
            return acc;
        }, {});

        const result = accounts.map((a) => ({
            ...a,
            admins: (adminsByAccount[a.id] ?? []).map((r) => ({
                ...r.admin,
                grantedAt: r.grantedAt,
            })),
        }));

        res.json(result);
    } catch (error) {
        console.error("getOfficialAccounts error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * POST /api/god/official-accounts/:id/admins
 * เพิ่ม admin คนใหม่ให้ official account
 * Body: { adminUserId }
 */
export const addOfficialAccountAdmin = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { adminUserId } = req.body;

    if (!adminUserId) return res.status(400).json({ message: "adminUserId is required" });

    try {
        // ตรวจว่า account มีอยู่จริง
        const [account] = await dbClient
            .select({ id: officialAccountsTable.id })
            .from(officialAccountsTable)
            .where(eq(officialAccountsTable.id, id));
        if (!account) return res.status(404).json({ message: "Official account not found" });

        // ตรวจว่า user มีอยู่จริง
        const [targetUser] = await dbClient
            .select({ id: usersTable.id, role: usersTable.role })
            .from(usersTable)
            .where(eq(usersTable.id, adminUserId));
        if (!targetUser) return res.status(404).json({ message: "User not found" });
        if (targetUser.role === "official_account") return res.status(400).json({ message: "Cannot assign official_account as admin" });

        // Upgrade role → admin ถ้ายังเป็น user (god ไม่ต้อง upgrade)
        if (targetUser.role === "user") {
            await dbClient
                .update(usersTable)
                .set({ role: "admin" })
                .where(eq(usersTable.id, adminUserId));
        }

        // Insert junction (unique constraint จะป้องกัน duplicate)
        await dbClient
            .insert(officialAccountAdminsTable)
            .values({ officialAccountId: id, adminUserId })
            .onConflictDoNothing();

        res.json({ message: "Admin added successfully" });
    } catch (error) {
        console.error("addOfficialAccountAdmin error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * GET /api/god/users/search?query=...
 * ค้นหา users สำหรับเลือกเป็น owner/admin ของ official account
 * — ยกเว้น users ที่มี role "official_account"
 */
export const searchUsersForOfficialAccount = async (req: Request, res: Response) => {
    const { query } = req.query;

    if (!query || typeof query !== "string") {
        return res.status(400).json({ message: "query parameter is required" });
    }

    const searchTerm = query.trim().replace(/^@/, "");
    if (searchTerm.length === 0) {
        return res.json([]);
    }

    try {
        const users = await dbClient
            .select({
                id: usersTable.id,
                firstName: usersTable.firstName,
                lastName: usersTable.lastName,
                username: usersTable.username,
                email: usersTable.email,
                role: usersTable.role,
                status: usersTable.status,
                avatarUrl: usersTable.avatarUrl,
                faculty: usersTable.faculty,
            })
            .from(usersTable)
            .where(
                sql`(
                    LOWER(${usersTable.firstName}) LIKE LOWER(${`%${searchTerm}%`}) OR
                    LOWER(${usersTable.lastName}) LIKE LOWER(${`%${searchTerm}%`}) OR
                    LOWER(${usersTable.username}) LIKE LOWER(${`%${searchTerm}%`}) OR
                    LOWER(${usersTable.email}) LIKE LOWER(${`%${searchTerm}%`}) OR
                    LOWER(CONCAT(${usersTable.firstName}, ' ', ${usersTable.lastName})) LIKE LOWER(${`%${searchTerm}%`})
                )
                AND ${usersTable.role} != ${"official_account"}`
            )
            .orderBy(usersTable.firstName)
            .limit(20);

        res.json(users);
    } catch (error) {
        console.error("searchUsersForOfficialAccount error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * DELETE /api/god/official-accounts/:id/admins/:adminUserId
 * ถอด admin ออกจาก official account — ถ้าไม่เหลือ official account ใดให้ manage, auto-downgrade role → "user"
 */
export const removeOfficialAccountAdmin = async (req: Request, res: Response) => {
    const { id, adminUserId } = req.params;

    try {
        // ห้ามถอด owner ออก
        const [account] = await dbClient
            .select({ ownerId: officialAccountsTable.ownerId })
            .from(officialAccountsTable)
            .where(eq(officialAccountsTable.id, id));
        if (!account) return res.status(404).json({ message: "Official account not found" });
        if (account.ownerId === adminUserId) {
            return res.status(400).json({ message: "Cannot remove the owner. Transfer ownership first." });
        }

        await dbClient
            .delete(officialAccountAdminsTable)
            .where(
                and(
                    eq(officialAccountAdminsTable.officialAccountId, id),
                    eq(officialAccountAdminsTable.adminUserId, adminUserId)
                )
            );

        // Auto-downgrade: ถ้า user ไม่มี official account ที่ตัวเองเป็น admin อีกแล้ว → role กลับเป็น "user"
        await downgradeIfNoOfficialAccounts(adminUserId);

        res.json({ message: "Admin removed successfully" });
    } catch (error) {
        console.error("removeOfficialAccountAdmin error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * POST /api/god/notifications/global
 * ส่ง notification ประเภท "other" ไปหาทุกคนในระบบ (ยกเว้นตัว god เอง)
 * Body: { message }
 */
export const sendGlobalNotification = async (req: Request, res: Response) => {
    // Use activeUserId so it works correctly even in official account mode
    const senderId: string = req.session?.activeUserId ?? req.session?.userId ?? "";
    const { message } = req.body;

    if (!message?.trim()) {
        return res.status(400).json({ message: "message is required" });
    }

    try {
        // ดึง id ผู้ใช้ทุกคน — รวม anonymous ด้วย ไม่มียกเว้น
        const recipients = await dbClient
            .select({ id: usersTable.id })
            .from(usersTable);

        if (recipients.length === 0) {
            return res.json({ message: "No recipients found", count: 0 });
        }

        // Generate a unique batch token so the sent-history can group by this batch
        const { randomUUID } = await import("crypto");
        const batchId = randomUUID();

        // Batch insert notifications — all sharing the same batchId in referenceId
        // senderId is intentionally set to null so frontend always renders "FROM ADMIN"
        // regardless of what role the sender account has at query time
        const rows = recipients.map((r) => ({
            recipientId: r.id,
            senderId: null,
            type: "other" as const,
            referenceId: batchId,
            message: message.trim(),
            isRead: false,
        }));

        await dbClient.insert(notificationsTable).values(rows);

        res.json({ message: `Notification sent to ${rows.length} users`, count: rows.length });
    } catch (error) {
        console.error("sendGlobalNotification error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * POST /api/god/notifications/private
 * ส่ง notification ไปหาผู้ใช้ที่เลือก (หลายคน)
 * Body: { recipientIds: string[], message }
 */
export const sendPrivateNotifications = async (req: Request, res: Response) => {
    const senderId: string = req.session?.activeUserId ?? req.session?.userId ?? "";
    const { recipientIds, message } = req.body;

    if (!message?.trim()) {
        return res.status(400).json({ message: "message is required" });
    }
    if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
        return res.status(400).json({ message: "recipientIds must be a non-empty array" });
    }

    try {
        // ตรวจว่า users เหล่านั้นมีอยู่จริง
        const existing = await dbClient
            .select({ id: usersTable.id })
            .from(usersTable)
            .where(
                sql`${usersTable.id} = ANY(ARRAY[${sql.join(
                    recipientIds.map((id: string) => sql`${id}::uuid`),
                    sql`, `
                )}])`
            );

        if (existing.length === 0) {
            return res.status(404).json({ message: "No valid recipients found" });
        }

        // Generate a unique batch token so the sent-history can group by this batch
        const { randomUUID } = await import("crypto");
        const batchId = randomUUID();

        // senderId is intentionally set to null so frontend always renders "FROM ADMIN"
        // regardless of what role the sender account has at query time
        const rows = existing.map((r) => ({
            recipientId: r.id,
            senderId: null,
            type: "other" as const,
            referenceId: batchId,
            message: message.trim(),
            isRead: false,
        }));

        await dbClient.insert(notificationsTable).values(rows);

        res.json({ message: `Notification sent to ${rows.length} users`, count: rows.length });
    } catch (error) {
        console.error("sendPrivateNotifications error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * GET /api/god/notifications/sent?page=1&limit=10
 * ดึงประวัติ notification ที่ god ส่ง — group by referenceId (batch token ที่ generate ตอนส่ง)
 * Rows ที่ยังไม่มี referenceId (ส่งก่อน patch นี้) จะ group by message+minute เพื่อ backward-compat
 */
export const getSentNotifications = async (req: Request, res: Response) => {
    const senderId: string = req.session?.activeUserId ?? req.session?.userId ?? "";
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const offset = (page - 1) * limit;

    if (!senderId) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        // Get total user count to determine isGlobal
        const [totalUsersRow] = await dbClient
            .select({ total: count() })
            .from(usersTable);
        const totalUsers = Number(totalUsersRow?.total ?? 0);

        // Step 1: Get paginated batches grouped by referenceId
        // For old rows without referenceId, fall back to grouping by (message, truncated minute)
        const rows = await dbClient.execute(sql`
            SELECT
                COALESCE(reference_id::text, CONCAT(message, '|', DATE_TRUNC('minute', MIN(created_at))::text)) AS batch_key,
                reference_id,
                message,
                MIN(created_at) AS sent_at,
                COUNT(*)::int AS recipient_count
            FROM notifications
            WHERE sender_id = ${senderId}::uuid
              AND type = 'other'
            GROUP BY reference_id, message
            ORDER BY MIN(created_at) DESC
            LIMIT ${limit} OFFSET ${offset}
        `) as unknown as {
            batch_key: string;
            reference_id: string | null;
            message: string | null;
            sent_at: string;
            recipient_count: number;
        }[];

        // Step 2: Total count of distinct batches
        const [totalRow] = await dbClient.execute(sql`
            SELECT COUNT(*)::int AS total
            FROM (
                SELECT COALESCE(reference_id::text, CONCAT(message, '|', DATE_TRUNC('minute', MIN(created_at))::text)) AS batch_key
                FROM notifications
                WHERE sender_id = ${senderId}::uuid
                  AND type = 'other'
                GROUP BY reference_id, message
            ) sub
        `) as unknown as { total: number }[];

        const total = Number(totalRow?.total ?? 0);

        // Step 3: Get recipient preview (up to 3 names) per batch in one pass
        const previewMap: Record<string, string> = {};

        for (const r of rows) {
            let previewResult: { recipient_preview: string | null }[];
            if (r.reference_id) {
                // New batches: group by referenceId for exact accuracy
                previewResult = await dbClient.execute(sql`
                    SELECT STRING_AGG(full_name, ', ') AS recipient_preview
                    FROM (
                        SELECT CONCAT(u2.first_name, ' ', u2.last_name) AS full_name
                        FROM notifications n2
                        LEFT JOIN users u2 ON n2.recipient_id = u2.id
                        WHERE n2.sender_id = ${senderId}::uuid
                          AND n2.reference_id = ${r.reference_id}::uuid
                          AND n2.type = 'other'
                        LIMIT 3
                    ) sub
                `) as unknown as { recipient_preview: string | null }[];
            } else {
                // Old batches (no referenceId): fall back to message match
                previewResult = await dbClient.execute(sql`
                    SELECT STRING_AGG(full_name, ', ') AS recipient_preview
                    FROM (
                        SELECT CONCAT(u2.first_name, ' ', u2.last_name) AS full_name
                        FROM notifications n2
                        LEFT JOIN users u2 ON n2.recipient_id = u2.id
                        WHERE n2.sender_id = ${senderId}::uuid
                          AND n2.message = ${r.message ?? ""}
                          AND n2.type = 'other'
                        LIMIT 3
                    ) sub
                `) as unknown as { recipient_preview: string | null }[];
            }
            previewMap[r.batch_key] = previewResult[0]?.recipient_preview ?? "";
        }

        res.json({
            data: rows.map((r) => ({
                message: r.message,
                sentAt: r.sent_at,
                recipientCount: r.recipient_count,
                recipientPreview: previewMap[r.batch_key] ?? null,
                // Global = sent to everyone (within 10% tolerance for any timing differences)
                isGlobal: r.recipient_count >= Math.floor(totalUsers * 0.9),
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasMore: offset + limit < total,
            },
        });
    } catch (error) {
        console.error("getSentNotifications error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * GET /api/god/users/search-all?query=...
 * Search ALL users including official_account role — for private message recipients
 */
export const searchAllUsers = async (req: Request, res: Response) => {
    const { query } = req.query;

    if (!query || typeof query !== "string") {
        return res.status(400).json({ message: "query parameter is required" });
    }

    const searchTerm = query.trim().replace(/^@/, "");
    if (searchTerm.length === 0) {
        return res.json([]);
    }

    try {
        const users = await dbClient
            .select({
                id: usersTable.id,
                firstName: usersTable.firstName,
                lastName: usersTable.lastName,
                username: usersTable.username,
                email: usersTable.email,
                role: usersTable.role,
                status: usersTable.status,
                avatarUrl: usersTable.avatarUrl,
                faculty: usersTable.faculty,
            })
            .from(usersTable)
            .where(
                sql`(
                    LOWER(${usersTable.firstName}) LIKE LOWER(${`%${searchTerm}%`}) OR
                    LOWER(${usersTable.lastName}) LIKE LOWER(${`%${searchTerm}%`}) OR
                    LOWER(${usersTable.username}) LIKE LOWER(${`%${searchTerm}%`}) OR
                    LOWER(${usersTable.email}) LIKE LOWER(${`%${searchTerm}%`}) OR
                    LOWER(CONCAT(${usersTable.firstName}, ' ', ${usersTable.lastName})) LIKE LOWER(${`%${searchTerm}%`})
                )`
            )
            .orderBy(usersTable.firstName)
            .limit(20);

        res.json(users);
    } catch (error) {
        console.error("searchAllUsers error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
