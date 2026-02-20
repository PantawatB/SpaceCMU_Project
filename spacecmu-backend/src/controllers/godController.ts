import type { Request, Response } from "express";
import { dbClient } from "../../db/client.js";
import { usersTable, postsTable, sessionsTable, activitiesTable } from "../../db/schema.js";
import { eq, count, sql, desc, ne, and } from "drizzle-orm";

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

/** GET /api/god/users — all users with role info */
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
                createdAt: usersTable.createdAt,
                lastActiveAt: usersTable.lastActiveAt,
            })
            .from(usersTable)
            .where(eq(usersTable.isAnonymous, false))
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
                    email: usersTable.email,
                    role: usersTable.role,
                },
            })
            .from(activitiesTable)
            .leftJoin(usersTable, eq(activitiesTable.userId, usersTable.id))
            .orderBy(desc(activitiesTable.createdAt))
            .limit(200);

        res.json(logs);
    } catch (error) {
        console.error("God getFullActivityLog error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
