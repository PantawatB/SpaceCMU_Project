import type { Request, Response } from "express";
import { dbClient } from "../../db/client.js";
import { usersTable, postsTable, sessionsTable, announcementsTable, activitiesTable, officialAccountsTable, officialAccountAdminsTable } from "../../db/schema.js";
import { eq, count, sql, desc, or, and } from "drizzle-orm";

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        // 1. Total Users (excluding anonymous)
        const [totalUsersResult] = await dbClient
            .select({ count: count() })
            .from(usersTable)
            .where(eq(usersTable.isAnonymous, false));

        // 2. Active Users (Distinct active_user_id in sessions)
        const [activeUsersResult] = await dbClient
            .select({ count: sql<number>`count(distinct ${sessionsTable.activeUserId})` })
            .from(sessionsTable);

        // 3. Total Posts
        const [totalPostsResult] = await dbClient
            .select({ count: count() })
            .from(postsTable);

        // 4. Banned Users
        const [bannedUsersResult] = await dbClient
            .select({ count: count() })
            .from(usersTable)
            .where(eq(usersTable.status, "banned"));

        res.json({
            totalUsers: totalUsersResult?.count || 0,
            activeUsers: activeUsersResult?.count || 0,
            totalPosts: totalPostsResult?.count || 0,
            bannedUsers: bannedUsersResult?.count || 0,
        });
    } catch (error) {
        console.error("Error fetching admin stats:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const banUser = async (req: Request, res: Response) => {
    const { userId } = req.params;
    try {
        await dbClient
            .update(usersTable)
            .set({ status: "banned" })
            .where(eq(usersTable.id, userId));

        res.json({ message: "User banned successfully" });
    } catch (error) {
        console.error("Error banning user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const unbanUser = async (req: Request, res: Response) => {
    const { userId } = req.params;
    try {
        await dbClient
            .update(usersTable)
            .set({ status: "active" })
            .where(eq(usersTable.id, userId));

        res.json({ message: "User unbanned successfully" });
    } catch (error) {
        console.error("Error unbanning user:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const banPost = async (req: Request, res: Response) => {
    const { postId } = req.params;
    try {
        await dbClient
            .update(postsTable)
            .set({ status: "banned" })
            .where(eq(postsTable.id, postId));

        res.json({ message: "Post banned successfully" });
    } catch (error) {
        console.error("Error banning post:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const unbanPost = async (req: Request, res: Response) => {
    const { postId } = req.params;
    try {
        await dbClient
            .update(postsTable)
            .set({ status: "active" })
            .where(eq(postsTable.id, postId));

        res.json({ message: "Post unbanned successfully" });
    } catch (error) {
        console.error("Error unbanning post:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const createAnnouncement = async (req: Request, res: Response) => {
    try {
        const { content, type, targetUserId } = req.body;
        const adminId = req.session?.userId; // use real owner, not activeUserId

        if (!adminId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (!content || !type) {
            return res.status(400).json({ message: "Content and type are required" });
        }

        if (type === 'private' && !targetUserId) {
            return res.status(400).json({ message: "targetUserId is required for private announcements" });
        }

        const [newAnnouncement] = await dbClient
            .insert(announcementsTable)
            .values({
                authorId: adminId,
                content,
                type,
                targetUserId: type === 'private' ? targetUserId : null,
            })
            .returning();

        res.status(201).json(newAnnouncement);
    } catch (error: any) {
        console.error("Error creating announcement:", error);
        res.status(500).json({ message: "Error creating announcement" });
    }
};

export const getActivities = async (req: Request, res: Response) => {
    try {
        const logs = await dbClient
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
                    avatarUrl: usersTable.avatarUrl,
                    email: usersTable.email,
                },
            })
            .from(activitiesTable)
            .leftJoin(usersTable, eq(activitiesTable.userId, usersTable.id))
            .orderBy(desc(activitiesTable.createdAt))
            .limit(100);

        res.json(logs);
    } catch (error) {
        console.error("Error fetching activity logs:", error);
        res.status(500).json({ message: "Error fetching activity logs" });
    }
};

/**
 * GET /api/admin/my-official-accounts
 * ดึง official accounts ที่ admin คนนี้บริหารอยู่ (ทั้ง owner และ admin ทั่วไป)
 */
export const getMyOfficialAccounts = async (req: Request, res: Response) => {
    const callerId = req.session?.userId; // use real owner, not activeUserId
    if (!callerId) return res.status(401).json({ message: "Unauthorized" });

    try {
        // หา official account ที่ caller เป็น admin (ผ่าน junction table)
        const myAccountIds = await dbClient
            .select({ officialAccountId: officialAccountAdminsTable.officialAccountId })
            .from(officialAccountAdminsTable)
            .where(eq(officialAccountAdminsTable.adminUserId, callerId));

        if (myAccountIds.length === 0) {
            return res.json([]);
        }

        const ids = myAccountIds.map((r) => r.officialAccountId);

        // ดึงข้อมูล official accounts ทั้งหมดที่ caller บริหาร
        // เราต้อง query แบบ in() แต่ใช้ or() เพื่อ compatibility
        const accounts = await dbClient
            .select({
                id: officialAccountsTable.id,
                name: officialAccountsTable.name,
                username: officialAccountsTable.username,
                faculty: officialAccountsTable.faculty,
                createdAt: officialAccountsTable.createdAt,
                userId: officialAccountsTable.userId,
                ownerId: officialAccountsTable.ownerId,
            })
            .from(officialAccountsTable)
            .where(
                ids.length === 1
                    ? eq(officialAccountsTable.id, ids[0])
                    : or(...ids.map((id) => eq(officialAccountsTable.id, id)))!
            );

        // ดึง owner info และ admins ของแต่ละ account
        const result = await Promise.all(
            accounts.map(async (acc) => {
                // owner
                const [owner] = await dbClient
                    .select({
                        id: usersTable.id,
                        firstName: usersTable.firstName,
                        lastName: usersTable.lastName,
                        username: usersTable.username,
                        email: usersTable.email,
                        avatarUrl: usersTable.avatarUrl,
                    })
                    .from(usersTable)
                    .where(eq(usersTable.id, acc.ownerId));

                // admins (via junction)
                const admins = await dbClient
                    .select({
                        id: usersTable.id,
                        firstName: usersTable.firstName,
                        lastName: usersTable.lastName,
                        username: usersTable.username,
                        email: usersTable.email,
                        avatarUrl: usersTable.avatarUrl,
                        grantedAt: officialAccountAdminsTable.grantedAt,
                    })
                    .from(officialAccountAdminsTable)
                    .leftJoin(usersTable, eq(officialAccountAdminsTable.adminUserId, usersTable.id))
                    .where(eq(officialAccountAdminsTable.officialAccountId, acc.id));

                return {
                    ...acc,
                    isOwner: acc.ownerId === callerId,
                    owner: owner ?? null,
                    admins,
                };
            })
        );

        res.json(result);
    } catch (error) {
        console.error("getMyOfficialAccounts error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * POST /api/admin/my-official-accounts/:id/admins
 * Owner เพิ่ม admin ให้ official account ของตัวเอง
 * Body: { adminUserId }
 */
export const addAdminToMyAccount = async (req: Request, res: Response) => {
    const callerId = req.session?.userId; // use real owner, not activeUserId
    if (!callerId) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const { adminUserId } = req.body;
    if (!adminUserId) return res.status(400).json({ message: "adminUserId is required" });

    try {
        // ตรวจว่า account มีอยู่และ caller เป็น owner
        const [account] = await dbClient
            .select({ id: officialAccountsTable.id, ownerId: officialAccountsTable.ownerId })
            .from(officialAccountsTable)
            .where(eq(officialAccountsTable.id, id));
        if (!account) return res.status(404).json({ message: "Official account not found" });
        if (account.ownerId !== callerId) return res.status(403).json({ message: "Only the owner can manage admins" });

        // ตรวจว่า target user มีอยู่จริงและไม่ใช่ official_account
        const [targetUser] = await dbClient
            .select({ id: usersTable.id, role: usersTable.role })
            .from(usersTable)
            .where(eq(usersTable.id, adminUserId));
        if (!targetUser) return res.status(404).json({ message: "User not found" });
        if (targetUser.role === "official_account") return res.status(400).json({ message: "Cannot assign official_account as admin" });

        // Upgrade role → admin ถ้ายังเป็น user
        if (targetUser.role === "user") {
            await dbClient.update(usersTable).set({ role: "admin" }).where(eq(usersTable.id, adminUserId));
        }

        await dbClient
            .insert(officialAccountAdminsTable)
            .values({ officialAccountId: id, adminUserId })
            .onConflictDoNothing();

        res.json({ message: "Admin added successfully" });
    } catch (error) {
        console.error("addAdminToMyAccount error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * DELETE /api/admin/my-official-accounts/:id/admins/:adminUserId
 * Owner ลบ admin ออกจาก official account ของตัวเอง
 */
export const removeAdminFromMyAccount = async (req: Request, res: Response) => {
    const callerId = req.session?.userId; // use real owner, not activeUserId
    if (!callerId) return res.status(401).json({ message: "Unauthorized" });

    const { id, adminUserId } = req.params;

    try {
        const [account] = await dbClient
            .select({ id: officialAccountsTable.id, ownerId: officialAccountsTable.ownerId })
            .from(officialAccountsTable)
            .where(eq(officialAccountsTable.id, id));
        if (!account) return res.status(404).json({ message: "Official account not found" });
        if (account.ownerId !== callerId) return res.status(403).json({ message: "Only the owner can manage admins" });
        if (account.ownerId === adminUserId) return res.status(400).json({ message: "Cannot remove yourself as owner" });

        await dbClient
            .delete(officialAccountAdminsTable)
            .where(
                and(
                    eq(officialAccountAdminsTable.officialAccountId, id),
                    eq(officialAccountAdminsTable.adminUserId, adminUserId)
                )
            );

        res.json({ message: "Admin removed successfully" });
    } catch (error) {
        console.error("removeAdminFromMyAccount error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * DELETE /api/admin/my-official-accounts/:id/leave
 * Admin (non-owner) ลาออกจากการเป็น admin ของ official account
 */
export const leaveOfficialAccount = async (req: Request, res: Response) => {
    const callerId = req.session?.userId; // use real owner, not activeUserId
    if (!callerId) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;

    try {
        const [account] = await dbClient
            .select({ id: officialAccountsTable.id, ownerId: officialAccountsTable.ownerId })
            .from(officialAccountsTable)
            .where(eq(officialAccountsTable.id, id));
        if (!account) return res.status(404).json({ message: "Official account not found" });
        if (account.ownerId === callerId) {
            return res.status(400).json({ message: "Owner cannot leave. Transfer ownership first." });
        }

        // ตรวจว่า caller เป็น admin จริง
        const [membership] = await dbClient
            .select({ id: officialAccountAdminsTable.id })
            .from(officialAccountAdminsTable)
            .where(
                and(
                    eq(officialAccountAdminsTable.officialAccountId, id),
                    eq(officialAccountAdminsTable.adminUserId, callerId)
                )
            );
        if (!membership) return res.status(404).json({ message: "You are not an admin of this account" });

        await dbClient
            .delete(officialAccountAdminsTable)
            .where(
                and(
                    eq(officialAccountAdminsTable.officialAccountId, id),
                    eq(officialAccountAdminsTable.adminUserId, callerId)
                )
            );

        res.json({ message: "You have left the official account" });
    } catch (error) {
        console.error("leaveOfficialAccount error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * POST /api/admin/my-official-accounts/:id/transfer-owner
 * Owner โอนความเป็นเจ้าของให้ admin คนอื่น
 * Body: { newOwnerId }
 */
export const transferOwnership = async (req: Request, res: Response) => {
    const callerId = req.session?.userId; // use real owner, not activeUserId
    if (!callerId) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const { newOwnerId } = req.body;
    if (!newOwnerId) return res.status(400).json({ message: "newOwnerId is required" });

    try {
        const [account] = await dbClient
            .select({ id: officialAccountsTable.id, ownerId: officialAccountsTable.ownerId })
            .from(officialAccountsTable)
            .where(eq(officialAccountsTable.id, id));
        if (!account) return res.status(404).json({ message: "Official account not found" });
        if (account.ownerId !== callerId) return res.status(403).json({ message: "Only the owner can transfer ownership" });
        if (newOwnerId === callerId) return res.status(400).json({ message: "You are already the owner" });

        // ตรวจว่า new owner เป็น admin ของ account นี้อยู่แล้ว
        const [membership] = await dbClient
            .select({ id: officialAccountAdminsTable.id })
            .from(officialAccountAdminsTable)
            .where(
                and(
                    eq(officialAccountAdminsTable.officialAccountId, id),
                    eq(officialAccountAdminsTable.adminUserId, newOwnerId)
                )
            );
        if (!membership) return res.status(400).json({ message: "New owner must already be an admin of this account" });

        // อัปเดต ownerId
        await dbClient
            .update(officialAccountsTable)
            .set({ ownerId: newOwnerId })
            .where(eq(officialAccountsTable.id, id));

        res.json({ message: "Ownership transferred successfully" });
    } catch (error) {
        console.error("transferOwnership error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
