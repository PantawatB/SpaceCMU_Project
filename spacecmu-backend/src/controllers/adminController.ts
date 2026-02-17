import type { Request, Response } from "express";
import { dbClient } from "../../db/client.js";
import { usersTable, postsTable, sessionsTable, announcementsTable, activitiesTable } from "../../db/schema.js";
import { eq, count, sql, desc } from "drizzle-orm";

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
        const adminId = req.session?.activeUserId;

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
