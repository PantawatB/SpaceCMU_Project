import type { Request, Response } from "express";
import { dbClient } from "../../db/client.js";
import { chatRoomsTable, chatRoomMembersTable, usersTable, messagesTable } from "../../db/schema.js";
import { eq, and, or, desc, sql, inArray } from "drizzle-orm";

// Create a direct (1-on-1) chat room
export const createDirectRoom = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        const { otherUserId } = req.body;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (!otherUserId) {
            return res.status(400).json({ message: "otherUserId is required" });
        }

        // Check if room already exists between these two users
        const existingMembers = await dbClient
            .select({
                roomId: chatRoomMembersTable.roomId,
            })
            .from(chatRoomMembersTable)
            .where(
                or(
                    eq(chatRoomMembersTable.userId, userId),
                    eq(chatRoomMembersTable.userId, otherUserId)
                )
            );

        // Group by roomId and find rooms with both users
        const roomCounts = new Map<string, Set<string>>();
        for (const member of existingMembers) {
            if (!roomCounts.has(member.roomId)) {
                roomCounts.set(member.roomId, new Set());
            }
            const members = await dbClient
                .select({ userId: chatRoomMembersTable.userId })
                .from(chatRoomMembersTable)
                .where(eq(chatRoomMembersTable.roomId, member.roomId));

            for (const m of members) {
                roomCounts.get(member.roomId)!.add(m.userId);
            }
        }

        // Find a room with exactly these two users and isGroup = false
        for (const [roomId, members] of roomCounts.entries()) {
            if (members.size === 2 && members.has(userId) && members.has(otherUserId)) {
                const room = await dbClient
                    .select()
                    .from(chatRoomsTable)
                    .where(and(
                        eq(chatRoomsTable.id, roomId),
                        eq(chatRoomsTable.isGroup, false)
                    ))
                    .limit(1);

                if (room.length > 0) {
                    return res.json({
                        message: "Room already exists",
                        room: room[0],
                        isNew: false
                    });
                }
            }
        }

        // Create new room
        const newRoom = await dbClient
            .insert(chatRoomsTable)
            .values({
                isGroup: false,
                createdBy: userId,
            })
            .returning();

        // Add both users as members
        await dbClient
            .insert(chatRoomMembersTable)
            .values([
                { roomId: newRoom[0].id, userId: userId, role: "member" },
                { roomId: newRoom[0].id, userId: otherUserId, role: "member" },
            ]);

        res.status(201).json({
            message: "Direct room created successfully",
            room: newRoom[0],
            isNew: true
        });

        // Log Activity
        await import("../utils/activityLogger.js").then(({ logActivity }) => {
            logActivity(userId, "Created direct chat", `Created chat with user ${otherUserId}`, req);
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error creating direct room" });
    }
};

// Create a group chat room
export const createGroupRoom = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        // รองรับทั้ง JSON body (memberIds) และ FormData (memberIds[])
        const name = req.body.name;
        const rawMemberIds = req.body.memberIds ?? req.body["memberIds[]"];
        const memberIds: string[] = Array.isArray(rawMemberIds)
            ? rawMemberIds
            : rawMemberIds
            ? [rawMemberIds]
            : [];

        // ถ้าส่งมาเป็น FormData จะมี req.file, ถ้าส่ง JSON จะไม่มี
        const uploadedFile = (req as any).file as Express.Multer.File | undefined;
        const avatarUrl = uploadedFile
            ? `/uploads/${uploadedFile.filename}`
            : (req.body.avatarUrl ?? null);

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (!name || memberIds.length < 1) {
            return res.status(400).json({
                message: "name and memberIds (array with at least 1 member) are required"
            });
        }

        // Create group room
        const newRoom = await dbClient
            .insert(chatRoomsTable)
            .values({
                name,
                avatarUrl: avatarUrl || null,
                isGroup: true,
                createdBy: userId,
            })
            .returning();

        // Add creator as admin
        const members: Array<{ roomId: string; userId: string; role: "member" | "admin" }> = [
            { roomId: newRoom[0].id, userId: userId, role: "admin" },
        ];

        // Add other members
        for (const memberId of memberIds) {
            if (memberId !== userId) {
                members.push({
                    roomId: newRoom[0].id,
                    userId: memberId,
                    role: "member"
                });
            }
        }

        await dbClient.insert(chatRoomMembersTable).values(members);

        res.status(201).json({
            message: "Group room created successfully",
            room: newRoom[0],
        });

        // Log Activity
        await import("../utils/activityLogger.js").then(({ logActivity }) => {
            logActivity(userId, "Created group chat", `Created group chat: ${name}`, req);
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error creating group room" });
    }
};

// Get all rooms for a user
export const getUserRooms = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Get all rooms where user is a member
        const userRoomMembers = await dbClient
            .select({ roomId: chatRoomMembersTable.roomId })
            .from(chatRoomMembersTable)
            .where(eq(chatRoomMembersTable.userId, userId));

        const roomIds = userRoomMembers.map(m => m.roomId);

        if (roomIds.length === 0) {
            return res.json([]);
        }

        // Get room details
        const rooms = await dbClient
            .select()
            .from(chatRoomsTable)
            .where(inArray(chatRoomsTable.id, roomIds));

        // Get details for each room
        const roomsWithDetails = await Promise.all(
            rooms.map(async (room) => {
                // Get members
                const members = await dbClient
                    .select({
                        userId: chatRoomMembersTable.userId,
                        role: chatRoomMembersTable.role,
                        joinedAt: chatRoomMembersTable.joinedAt,
                        lastReadAt: chatRoomMembersTable.lastReadAt,
                        firstName: usersTable.firstName,
                        lastName: usersTable.lastName,
                        avatarUrl: usersTable.avatarUrl,
                    })
                    .from(chatRoomMembersTable)
                    .innerJoin(usersTable, eq(chatRoomMembersTable.userId, usersTable.id))
                    .where(eq(chatRoomMembersTable.roomId, room.id));

                // Get last message (with sender name)
                const lastMessageRaw = await dbClient
                    .select({
                        id: messagesTable.id,
                        roomId: messagesTable.roomId,
                        senderId: messagesTable.senderId,
                        content: messagesTable.content,
                        createdAt: messagesTable.createdAt,
                        senderFirstName: usersTable.firstName,
                        senderLastName: usersTable.lastName,
                    })
                    .from(messagesTable)
                    .leftJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
                    .where(eq(messagesTable.roomId, room.id))
                    .orderBy(desc(messagesTable.createdAt))
                    .limit(1);

                const lastMessage = lastMessageRaw[0]
                    ? {
                          id: lastMessageRaw[0].id,
                          senderId: lastMessageRaw[0].senderId,
                          content: lastMessageRaw[0].content,
                          createdAt: lastMessageRaw[0].createdAt,
                          sender: {
                              firstName: lastMessageRaw[0].senderFirstName ?? "",
                              lastName: lastMessageRaw[0].senderLastName ?? "",
                          },
                      }
                    : null;

                // Get unread count for this user
                const userMember = await dbClient
                    .select({ lastReadAt: chatRoomMembersTable.lastReadAt })
                    .from(chatRoomMembersTable)
                    .where(
                        and(
                            eq(chatRoomMembersTable.roomId, room.id),
                            eq(chatRoomMembersTable.userId, userId)
                        )
                    )
                    .limit(1);

                let unreadCount = 0;
                if (userMember[0]?.lastReadAt) {
                    const lastReadIso = new Date(userMember[0].lastReadAt).toISOString();
                    const unreadResult = await dbClient
                        .select({ count: sql<number>`count(*)` })
                        .from(messagesTable)
                        .where(
                            and(
                                eq(messagesTable.roomId, room.id),
                                sql`${messagesTable.createdAt} > ${lastReadIso}::timestamptz`,
                                // ไม่นับข้อความที่ตัวเองส่ง
                                sql`${messagesTable.senderId} != ${userId}`
                            )
                        );
                    unreadCount = Number(unreadResult[0]?.count || 0);
                } else {
                    // If never read, count all messages except own
                    const unreadResult = await dbClient
                        .select({ count: sql<number>`count(*)` })
                        .from(messagesTable)
                        .where(
                            and(
                                eq(messagesTable.roomId, room.id),
                                // ไม่นับข้อความที่ตัวเองส่ง
                                sql`${messagesTable.senderId} != ${userId}`
                            )
                        );
                    unreadCount = Number(unreadResult[0]?.count || 0);
                }

                // For 1-on-1 chats, get the other user's name
                let displayName = room.name;
                let displayAvatar = room.avatarUrl;

                if (!room.isGroup && members.length === 2) {
                    const otherUser = members.find(m => m.userId !== userId);
                    if (otherUser) {
                        displayName = `${otherUser.firstName} ${otherUser.lastName}`;
                        displayAvatar = otherUser.avatarUrl;
                    }
                }

                return {
                    ...room,
                    displayName,
                    displayAvatar,
                    members,
                    memberCount: members.length,
                    lastMessage: lastMessage || null,
                    unreadCount,
                };
            })
        );

        // Sort by last message time
        roomsWithDetails.sort((a, b) => {
            const timeA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
            const timeB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
            return timeB - timeA;
        });

        res.json(roomsWithDetails);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching user rooms" });
    }
};

// Get room details
export const getRoomDetails = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        const { roomId } = req.params;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Check if user is a member
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

        // Get room
        const room = await dbClient
            .select()
            .from(chatRoomsTable)
            .where(eq(chatRoomsTable.id, roomId))
            .limit(1);

        if (room.length === 0) {
            return res.status(404).json({ message: "Room not found" });
        }

        // Get members
        const members = await dbClient
            .select({
                userId: chatRoomMembersTable.userId,
                role: chatRoomMembersTable.role,
                joinedAt: chatRoomMembersTable.joinedAt,
                firstName: usersTable.firstName,
                lastName: usersTable.lastName,
                avatarUrl: usersTable.avatarUrl,
            })
            .from(chatRoomMembersTable)
            .innerJoin(usersTable, eq(chatRoomMembersTable.userId, usersTable.id))
            .where(eq(chatRoomMembersTable.roomId, roomId));

        res.json({
            ...room[0],
            members,
            memberCount: members.length,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching room details" });
    }
};

// Update room (name, avatar)
export const updateRoom = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        const { roomId } = req.params;
        const { name, avatarUrl } = req.body;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Check if user is admin of the room
        const membership = await dbClient
            .select()
            .from(chatRoomMembersTable)
            .where(
                and(
                    eq(chatRoomMembersTable.roomId, roomId),
                    eq(chatRoomMembersTable.userId, userId),
                    eq(chatRoomMembersTable.role, "admin")
                )
            )
            .limit(1);

        if (membership.length === 0) {
            return res.status(403).json({ message: "Only admins can update room details" });
        }

        const updates: any = {};
        if (name !== undefined) updates.name = name;
        if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: "No fields to update" });
        }

        const updatedRoom = await dbClient
            .update(chatRoomsTable)
            .set(updates)
            .where(eq(chatRoomsTable.id, roomId))
            .returning();

        res.json({
            message: "Room updated successfully",
            room: updatedRoom[0],
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error updating room" });
    }
};

// Add member to room
export const addMember = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        const { roomId } = req.params;
        const { newUserId } = req.body;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (!newUserId) {
            return res.status(400).json({ message: "newUserId is required" });
        }

        // Check if requester is admin
        const membership = await dbClient
            .select()
            .from(chatRoomMembersTable)
            .where(
                and(
                    eq(chatRoomMembersTable.roomId, roomId),
                    eq(chatRoomMembersTable.userId, userId),
                    eq(chatRoomMembersTable.role, "admin")
                )
            )
            .limit(1);

        if (membership.length === 0) {
            return res.status(403).json({ message: "Only admins can add members" });
        }

        // Check if room is a group
        const room = await dbClient
            .select()
            .from(chatRoomsTable)
            .where(eq(chatRoomsTable.id, roomId))
            .limit(1);

        if (room.length === 0) {
            return res.status(404).json({ message: "Room not found" });
        }

        if (!room[0].isGroup) {
            return res.status(400).json({ message: "Cannot add members to 1-on-1 chats" });
        }

        // Add member
        const newMember = await dbClient
            .insert(chatRoomMembersTable)
            .values({
                roomId,
                userId: newUserId,
                role: "member",
            })
            .returning();

        res.status(201).json({
            message: "Member added successfully",
            member: newMember[0],
        });
    } catch (error: any) {
        if (error?.code === '23505') { // Unique constraint violation
            return res.status(400).json({ message: "User is already a member" });
        }
        console.error(error);
        res.status(500).json({ message: "Error adding member" });
    }
};

// Remove member from room
export const removeMember = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        const { roomId, targetUserId } = req.params;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Check if requester is admin
        const membership = await dbClient
            .select()
            .from(chatRoomMembersTable)
            .where(
                and(
                    eq(chatRoomMembersTable.roomId, roomId),
                    eq(chatRoomMembersTable.userId, userId),
                    eq(chatRoomMembersTable.role, "admin")
                )
            )
            .limit(1);

        if (membership.length === 0) {
            return res.status(403).json({ message: "Only admins can remove members" });
        }

        // Cannot remove yourself as admin (use leave instead)
        if (targetUserId === userId) {
            return res.status(400).json({ message: "Use leave endpoint to exit the room" });
        }

        // Remove member
        await dbClient
            .delete(chatRoomMembersTable)
            .where(
                and(
                    eq(chatRoomMembersTable.roomId, roomId),
                    eq(chatRoomMembersTable.userId, targetUserId)
                )
            );

        res.json({
            message: "Member removed successfully",
            removedUserId: targetUserId,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error removing member" });
    }
};

// Leave room
export const leaveRoom = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        const { roomId } = req.params;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Check if user is a member
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
            return res.status(404).json({ message: "You are not a member of this room" });
        }

        // Remove user from room
        await dbClient
            .delete(chatRoomMembersTable)
            .where(
                and(
                    eq(chatRoomMembersTable.roomId, roomId),
                    eq(chatRoomMembersTable.userId, userId)
                )
            );

        // Check if room is now empty
        const remainingMembers = await dbClient
            .select()
            .from(chatRoomMembersTable)
            .where(eq(chatRoomMembersTable.roomId, roomId));

        if (remainingMembers.length === 0) {
            // Delete the room if empty
            await dbClient
                .delete(chatRoomsTable)
                .where(eq(chatRoomsTable.id, roomId));

            return res.json({
                message: "Left room successfully. Room was deleted as it's now empty.",
            });
        }

        res.json({
            message: "Left room successfully",
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error leaving room" });
    }
};
