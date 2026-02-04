import type { Request, Response } from "express";
import { dbClient } from "../../db/client.js";
import { messagesTable, chatRoomsTable, chatRoomMembersTable, usersTable } from "../../db/schema.js";
import { eq, or, and, isNull, desc, sql, like } from "drizzle-orm";

// Send a new message (room-based)
export const sendMessage = async (req: Request, res: Response) => {
    try {
        const senderId = req.session?.activeUserId;
        const { roomId, content, receiverId } = req.body;

        if (!senderId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Support both new (roomId) and old (receiverId) API
        if (!roomId && !receiverId) {
            return res.status(400).json({ message: "roomId or receiverId is required" });
        }

        if (!content || content.trim() === "") {
            return res.status(400).json({ message: "content is required" });
        }

        let finalRoomId = roomId;

        // Backward compatibility: if receiverId provided, find or create room
        if (!roomId && receiverId) {
            // Find existing 1-on-1 room
            const senderRooms = await dbClient
                .select({ roomId: chatRoomMembersTable.roomId })
                .from(chatRoomMembersTable)
                .where(eq(chatRoomMembersTable.userId, senderId));

            const receiverRooms = await dbClient
                .select({ roomId: chatRoomMembersTable.roomId })
                .from(chatRoomMembersTable)
                .where(eq(chatRoomMembersTable.userId, receiverId));

            const commonRoomIds = senderRooms
                .filter(sr => receiverRooms.some(rr => rr.roomId === sr.roomId))
                .map(r => r.roomId);

            // Find 1-on-1 room
            for (const rid of commonRoomIds) {
                const room = await dbClient
                    .select()
                    .from(chatRoomsTable)
                    .where(and(
                        eq(chatRoomsTable.id, rid),
                        eq(chatRoomsTable.isGroup, false)
                    ))
                    .limit(1);

                if (room.length > 0) {
                    const members = await dbClient
                        .select()
                        .from(chatRoomMembersTable)
                        .where(eq(chatRoomMembersTable.roomId, rid));

                    if (members.length === 2) {
                        finalRoomId = rid;
                        break;
                    }
                }
            }

            // Create room if not exists
            if (!finalRoomId) {
                const newRoom = await dbClient
                    .insert(chatRoomsTable)
                    .values({
                        isGroup: false,
                        createdBy: senderId,
                    })
                    .returning();

                await dbClient
                    .insert(chatRoomMembersTable)
                    .values([
                        { roomId: newRoom[0].id, userId: senderId, role: "member" },
                        { roomId: newRoom[0].id, userId: receiverId, role: "member" },
                    ]);

                finalRoomId = newRoom[0].id;
            }
        }

        // Verify sender is a member of the room
        const membership = await dbClient
            .select()
            .from(chatRoomMembersTable)
            .where(
                and(
                    eq(chatRoomMembersTable.roomId, finalRoomId!),
                    eq(chatRoomMembersTable.userId, senderId)
                )
            )
            .limit(1);

        if (membership.length === 0) {
            return res.status(403).json({ message: "You are not a member of this room" });
        }

        const newMessage = await dbClient
            .insert(messagesTable)
            .values({
                roomId: finalRoomId!,
                senderId,
                receiverId: receiverId || null, // For backward compatibility
                content: content.trim()
            })
            .returning();

        res.status(201).json(newMessage[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error sending message" });
    }
};

// Get messages in a room
export const getRoomMessages = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        const { roomId } = req.params;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Verify user is a member
        const membership = await dbClient
            .select()
            .from(chatRoomMembersTable)
            .where(
                and(
                    eq(chatRoomMembersTable.roomId, roomId),
                    eq(chatRoomMembersTable.userId, userId)
                )
            )
            .limit(1);

        if (membership.length === 0) {
            return res.status(403).json({ message: "You are not a member of this room" });
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = (page - 1) * limit;

        // Get messages
        const messages = await dbClient
            .select()
            .from(messagesTable)
            .where(
                and(
                    eq(messagesTable.roomId, roomId),
                    isNull(messagesTable.deletedAt)
                )
            )
            .orderBy(desc(messagesTable.createdAt))
            .limit(limit)
            .offset(offset);

        // Get total count
        const totalResult = await dbClient
            .select({ count: sql<number>`count(*)` })
            .from(messagesTable)
            .where(
                and(
                    eq(messagesTable.roomId, roomId),
                    isNull(messagesTable.deletedAt)
                )
            );

        const total = Number(totalResult[0]?.count || 0);
        const totalPages = Math.ceil(total / limit);

        res.json({
            messages: messages.reverse(),
            pagination: {
                page,
                limit,
                total,
                totalPages
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching messages" });
    }
};

// Mark room as read for user
export const markRoomAsRead = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        const { roomId } = req.params;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Update lastReadAt
        await dbClient
            .update(chatRoomMembersTable)
            .set({ lastReadAt: new Date() })
            .where(
                and(
                    eq(chatRoomMembersTable.roomId, roomId),
                    eq(chatRoomMembersTable.userId, userId)
                )
            );

        res.json({
            success: true,
            message: "Room marked as read",
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error marking room as read" });
    }
};

// Delete a message (soft delete)
export const deleteMessage = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        const { messageId } = req.params;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Verify user is the sender
        const message = await dbClient
            .select()
            .from(messagesTable)
            .where(eq(messagesTable.id, messageId))
            .limit(1);

        if (message.length === 0) {
            return res.status(404).json({ message: "Message not found" });
        }

        if (message[0].senderId !== userId) {
            return res.status(403).json({ message: "You can only delete your own messages" });
        }

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

// Search messages in user's rooms
export const searchMessages = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        const { query, roomId } = req.query;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (!query) {
            return res.status(400).json({ message: "query is required" });
        }

        // Get user's rooms
        const userRooms = await dbClient
            .select({ roomId: chatRoomMembersTable.roomId })
            .from(chatRoomMembersTable)
            .where(eq(chatRoomMembersTable.userId, userId));

        const roomIds = userRooms.map(r => r.roomId);

        if (roomIds.length === 0) {
            return res.json({ results: [], count: 0, query });
        }

        let whereCondition = and(
            sql`${messagesTable.roomId} IN (${sql.join(roomIds.map(id => sql`${id}`), sql`, `)})`,
            like(messagesTable.content, `%${query}%`),
            isNull(messagesTable.deletedAt)
        );

        // Filter by specific room if provided
        if (roomId) {
            whereCondition = and(
                whereCondition,
                eq(messagesTable.roomId, roomId as string)
            );
        }

        const messages = await dbClient
            .select()
            .from(messagesTable)
            .where(whereCondition)
            .orderBy(desc(messagesTable.createdAt))
            .limit(50);

        // Get sender names
        const results = await Promise.all(
            messages.map(async (msg) => {
                const sender = await dbClient
                    .select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
                    .from(usersTable)
                    .where(eq(usersTable.id, msg.senderId))
                    .limit(1);

                return {
                    id: msg.id,
                    roomId: msg.roomId,
                    senderId: msg.senderId,
                    senderName: sender[0] ? `${sender[0].firstName} ${sender[0].lastName}` : "Unknown",
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

// ===== DEPRECATED FUNCTIONS (for backward compatibility) =====

// Get conversation between two users (DEPRECATED - use getRoomMessages instead)
export const getConversation = async (req: Request, res: Response) => {
    try {
        const activeUserId = req.session?.activeUserId;
        const { userId1, userId2 } = req.params;

        if (!activeUserId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (activeUserId !== userId1 && activeUserId !== userId2) {
            return res.status(403).json({ message: "Forbidden: You cannot access this conversation" });
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = (page - 1) * limit;

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
            messages: messages.reverse(),
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

// Get all conversations for a user (DEPRECATED - use getUserRooms from chatRoomController)
export const getUserConversations = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const sentMessages = await dbClient
            .selectDistinct({ partnerId: messagesTable.receiverId })
            .from(messagesTable)
            .where(and(eq(messagesTable.senderId, userId), isNull(messagesTable.deletedAt)));

        const receivedMessages = await dbClient
            .selectDistinct({ partnerId: messagesTable.senderId })
            .from(messagesTable)
            .where(and(eq(messagesTable.receiverId, userId), isNull(messagesTable.deletedAt)));

        const partnerIds = new Set([
            ...sentMessages.map(m => m.partnerId).filter(id => id !== null),
            ...receivedMessages.map(m => m.partnerId)
        ]);

        const conversations = await Promise.all(
            Array.from(partnerIds).map(async (partnerId) => {
                const partner = await dbClient
                    .select({
                        id: usersTable.id,
                        firstName: usersTable.firstName,
                        lastName: usersTable.lastName,
                        avatarUrl: usersTable.avatarUrl
                    })
                    .from(usersTable)
                    .where(eq(usersTable.id, partnerId!))
                    .limit(1);

                const lastMessage = await dbClient
                    .select()
                    .from(messagesTable)
                    .where(
                        and(
                            or(
                                and(eq(messagesTable.senderId, userId), eq(messagesTable.receiverId, partnerId!)),
                                and(eq(messagesTable.senderId, partnerId!), eq(messagesTable.receiverId, userId))
                            ),
                            isNull(messagesTable.deletedAt)
                        )
                    )
                    .orderBy(desc(messagesTable.createdAt))
                    .limit(1);

                const unreadResult = await dbClient
                    .select({ count: sql<number>`count(*)` })
                    .from(messagesTable)
                    .where(
                        and(
                            eq(messagesTable.senderId, partnerId!),
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

// Mark a specific message as read (DEPRECATED)
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

// Mark all messages from a sender as read (DEPRECATED)
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

// Get unread message count (DEPRECATED)
export const getUnreadCount = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

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
