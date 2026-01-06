import type { Request, Response } from "express";
import { dbClient } from "../../db/client.js";
import { notificationsTable } from "../../db/schema.js";
import { eq, desc } from "drizzle-orm";

export const getNotifications = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const notifications = await dbClient
            .select()
            .from(notificationsTable)
            .where(eq(notificationsTable.recipientId, userId))
            .orderBy(desc(notificationsTable.createdAt));
        res.json(notifications);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching notifications" });
    }
};

export const markAsRead = async (req: Request, res: Response) => {
    try {
        const { notificationId } = req.body;
        const updated = await dbClient
            .update(notificationsTable)
            .set({ isRead: true })
            .where(eq(notificationsTable.id, notificationId))
            .returning();
        res.json(updated[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error marking notification as read" });
    }
};
