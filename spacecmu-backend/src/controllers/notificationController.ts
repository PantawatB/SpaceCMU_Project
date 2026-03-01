import type { Request, Response } from "express";
import { dbClient } from "../../db/client.js";
import { notificationsTable, usersTable } from "../../db/schema.js";
import { eq, desc, and } from "drizzle-orm";

export const getNotifications = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const notifications = await dbClient
            .select({
                id: notificationsTable.id,
                recipientId: notificationsTable.recipientId,
                senderId: notificationsTable.senderId,
                type: notificationsTable.type,
                referenceId: notificationsTable.referenceId,
                message: notificationsTable.message,
                isRead: notificationsTable.isRead,
                createdAt: notificationsTable.createdAt,
                sender: {
                    firstName: usersTable.firstName,
                    lastName: usersTable.lastName,
                    avatarUrl: usersTable.avatarUrl,
                    role: usersTable.role,
                },
            })
            .from(notificationsTable)
            .leftJoin(usersTable, eq(notificationsTable.senderId, usersTable.id))
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

export const deleteNotification = async (req: Request, res: Response) => {
    try {
        const { notificationId } = req.params;
        const userId: string = req.session?.activeUserId ?? req.session?.userId ?? "";
        await dbClient
            .delete(notificationsTable)
            .where(
                and(
                    eq(notificationsTable.id, notificationId),
                    eq(notificationsTable.recipientId, userId)
                )
            );
        res.json({ message: "Notification deleted" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error deleting notification" });
    }
};

export const deleteAllNotifications = async (req: Request, res: Response) => {
    try {
        const userId: string = req.session?.activeUserId ?? req.session?.userId ?? "";
        await dbClient
            .delete(notificationsTable)
            .where(eq(notificationsTable.recipientId, userId));
        res.json({ message: "All notifications deleted" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error deleting notifications" });
    }
};
