import type { Request, Response } from "express";
import { dbClient } from "../../db/client.js";
import { messagesTable, usersTable } from "../../db/schema.js";
import { eq, or, and, isNull, desc, sql, like } from "drizzle-orm";

// Send a new message
export const sendMessage = async (req: Request, res: Response) => {
    try {
        const senderId = req.session?.activeUserId;
        const { receiverId, content } = req.body;

        if (!senderId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Validation
        if (!receiverId || !content || content.trim() === "") {
            return res.status(400).json({ message: "receiverId and content are required" });
        }

        const newMessage = await dbClient
            .insert(messagesTable)
            .values({ senderId, receiverId, content: content.trim() })
            .returning();

        res.status(201).json(newMessage[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error sending message" });
    }
};

// Get conversation between two users with pagination
export const getConversation = async (req: Request, res: Response) => {
    try {
        const activeUserId = req.session?.activeUserId;
        const { userId1, userId2 } = req.params;

        if (!activeUserId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Security: Ensure the requester is part of the conversation
        if (activeUserId !== userId1 && activeUserId !== userId2) {
            return res.status(403).json({ message: "Forbidden: You cannot access this conversation" });
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = (page - 1) * limit;

        // Get messages (excluding soft-deleted ones)
        const messages = await dbClient
            .select()
            .from(messagesTable)
            .where(
                and(
                    or(
                        and(eq(messagesTable.senderId, userId1), eq(messagesTable.receiverId, userId2)),
                        and(eq(messagesTable.senderId, userId2), eq(messagesTable.receiverId, userId1))
                    ),
                    isNull(messagesTable.deletedAt)
                )
            )
            .orderBy(desc(messagesTable.createdAt))
            .limit(limit)
            .offset(offset);

        // Get total count for pagination
        const totalResult = await dbClient
            .select({ count: sql<number>`count(*)` })
            .from(messagesTable)
            .where(
                and(
                    or(
                        and(eq(messagesTable.senderId, userId1), eq(messagesTable.receiverId, userId2)),
                        and(eq(messagesTable.senderId, userId2), eq(messagesTable.receiverId, userId1))
                    ),
                    isNull(messagesTable.deletedAt)
                )
            );

        const total = Number(totalResult[0]?.count || 0);
        const totalPages = Math.ceil(total / limit);

        res.json({
            messages: messages.reverse(), // Reverse to show oldest first
            pagination: {
                page,
                limit,
                total,
                totalPages
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching conversation" });
    }
};

// Get all conversations for a user with last message and unread count
export const getUserConversations = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Get all unique conversation partners
        const sentMessages = await dbClient
            .selectDistinct({ partnerId: messagesTable.receiverId })
            .from(messagesTable)
            .where(and(eq(messagesTable.senderId, userId), isNull(messagesTable.deletedAt)));

        const receivedMessages = await dbClient
            .selectDistinct({ partnerId: messagesTable.senderId })
            .from(messagesTable)
            .where(and(eq(messagesTable.receiverId, userId), isNull(messagesTable.deletedAt)));

        const partnerIds = new Set([
            ...sentMessages.map(m => m.partnerId),
            ...receivedMessages.map(m => m.partnerId)
        ]);

        // Get conversation details for each partner
        const conversations = await Promise.all(
            Array.from(partnerIds).map(async (partnerId) => {
                // Get partner info
                const partner = await dbClient
                    .select({
                        id: usersTable.id,
                        firstName: usersTable.firstName,
                        lastName: usersTable.lastName,
                        avatarUrl: usersTable.avatarUrl
                    })
                    .from(usersTable)
                    .where(eq(usersTable.id, partnerId))
                    .limit(1);

                // Get last message
                const lastMessage = await dbClient
                    .select()
                    .from(messagesTable)
                    .where(
                        and(
                            or(
                                and(eq(messagesTable.senderId, userId), eq(messagesTable.receiverId, partnerId)),
                                and(eq(messagesTable.senderId, partnerId), eq(messagesTable.receiverId, userId))
                            ),
                            isNull(messagesTable.deletedAt)
                        )
                    )
                    .orderBy(desc(messagesTable.createdAt))
                    .limit(1);

                // Get unread count
                const unreadResult = await dbClient
                    .select({ count: sql<number>`count(*)` })
                    .from(messagesTable)
                    .where(
                        and(
                            eq(messagesTable.senderId, partnerId),
                            eq(messagesTable.receiverId, userId),
                            eq(messagesTable.isRead, false),
                            isNull(messagesTable.deletedAt)
                        )
                    );

                const unreadCount = Number(unreadResult[0]?.count || 0);

                return {
                    userId: partner[0]?.id,
                    userName: partner[0] ? `${partner[0].firstName} ${partner[0].lastName}` : "Unknown User",
                    avatarUrl: partner[0]?.avatarUrl || null,
                    lastMessage: lastMessage[0] ? {
                        content: lastMessage[0].content,
                        createdAt: lastMessage[0].createdAt,
                        isRead: lastMessage[0].isRead
                    } : null,
                    unreadCount
                };
            })
        );

        // Sort by last message time
        conversations.sort((a, b) => {
            const timeA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
            const timeB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
            return timeB - timeA;
        });

        res.json(conversations);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching conversations" });
    }
};

// Mark a specific message as read
export const markAsRead = async (req: Request, res: Response) => {
    try {
        const { messageId } = req.params;

        await dbClient
            .update(messagesTable)
            .set({ isRead: true })
            .where(eq(messagesTable.id, messageId));

        res.json({
            success: true,
            message: "Message marked as read",
            messageId
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error marking message as read" });
    }
};

// Mark all messages from a sender as read
export const markAllAsRead = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        const { senderId } = req.body;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (!senderId) {
            return res.status(400).json({ message: "senderId is required" });
        }

        const result = await dbClient
            .update(messagesTable)
            .set({ isRead: true })
            .where(
                and(
                    eq(messagesTable.senderId, senderId),
                    eq(messagesTable.receiverId, userId),
                    eq(messagesTable.isRead, false),
                    isNull(messagesTable.deletedAt)
                )
            )
            .returning();

        res.json({
            success: true,
            message: "All messages marked as read",
            count: result.length
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error marking messages as read" });
    }
};

// Get unread message count for a user
export const getUnreadCount = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Get total unread count
        const totalResult = await dbClient
            .select({ count: sql<number>`count(*)` })
            .from(messagesTable)
            .where(
                and(
                    eq(messagesTable.receiverId, userId),
                    eq(messagesTable.isRead, false),
                    isNull(messagesTable.deletedAt)
                )
            );

        const totalUnread = Number(totalResult[0]?.count || 0);

        // Get unread count per sender
        const unreadBySender = await dbClient
            .select({
                senderId: messagesTable.senderId,
                count: sql<number>`count(*)`
            })
            .from(messagesTable)
            .where(
                and(
                    eq(messagesTable.receiverId, userId),
                    eq(messagesTable.isRead, false),
                    isNull(messagesTable.deletedAt)
                )
            )
            .groupBy(messagesTable.senderId);

        // Get sender names
        const conversations = await Promise.all(
            unreadBySender.map(async (item) => {
                const sender = await dbClient
                    .select({
                        firstName: usersTable.firstName,
                        lastName: usersTable.lastName
                    })
                    .from(usersTable)
                    .where(eq(usersTable.id, item.senderId))
                    .limit(1);

                return {
                    senderId: item.senderId,
                    senderName: sender[0] ? `${sender[0].firstName} ${sender[0].lastName}` : "Unknown User",
                    unreadCount: Number(item.count)
                };
            })
        );

        res.json({
            userId,
            unreadCount: totalUnread,
            conversations
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching unread count" });
    }
};

// Delete a message (soft delete)
export const deleteMessage = async (req: Request, res: Response) => {
    try {
        const { messageId } = req.params;

        await dbClient
            .update(messagesTable)
            .set({ deletedAt: new Date() })
            .where(eq(messagesTable.id, messageId));

        res.json({
            success: true,
            message: "Message deleted successfully",
            messageId
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error deleting message" });
    }
};

// Search messages
export const searchMessages = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        const { query, otherUserId } = req.query;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (!query) {
            return res.status(400).json({ message: "query is required" });
        }

        let whereCondition = and(
            or(
                eq(messagesTable.senderId, userId as string),
                eq(messagesTable.receiverId, userId as string)
            ),
            like(messagesTable.content, `%${query}%`),
            isNull(messagesTable.deletedAt)
        );

        // Filter by specific conversation if otherUserId provided
        if (otherUserId) {
            whereCondition = and(
                whereCondition,
                or(
                    and(eq(messagesTable.senderId, userId as string), eq(messagesTable.receiverId, otherUserId as string)),
                    and(eq(messagesTable.senderId, otherUserId as string), eq(messagesTable.receiverId, userId as string))
                )
            );
        }

        const messages = await dbClient
            .select()
            .from(messagesTable)
            .where(whereCondition)
            .orderBy(desc(messagesTable.createdAt))
            .limit(50);

        // Get user names for results
        const results = await Promise.all(
            messages.map(async (msg) => {
                const sender = await dbClient
                    .select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
                    .from(usersTable)
                    .where(eq(usersTable.id, msg.senderId))
                    .limit(1);

                const receiver = await dbClient
                    .select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
                    .from(usersTable)
                    .where(eq(usersTable.id, msg.receiverId))
                    .limit(1);

                return {
                    id: msg.id,
                    senderId: msg.senderId,
                    senderName: sender[0] ? `${sender[0].firstName} ${sender[0].lastName}` : "Unknown",
                    receiverId: msg.receiverId,
                    receiverName: receiver[0] ? `${receiver[0].firstName} ${receiver[0].lastName}` : "Unknown",
                    content: msg.content,
                    createdAt: msg.createdAt,
                    matchedText: query
                };
            })
        );

        res.json({
            results,
            count: results.length,
            query
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error searching messages" });
    }
};
