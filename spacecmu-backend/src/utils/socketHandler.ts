import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "http";

// Store online users: userId -> socketId
const onlineUsers = new Map<string, string>();

// Store typing status: conversationKey -> Set of userIds
const typingUsers = new Map<string, Set<string>>();

export const initializeSocket = (httpServer: HTTPServer) => {
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: ["http://localhost:3000", "http://localhost:5173"],
            credentials: true
        }
    });

    io.on("connection", (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        // User connects and provides their userId
        socket.on("user:online", (userId: string) => {
            onlineUsers.set(userId, socket.id);
            console.log(`User ${userId} is now online`);

            // Broadcast to all clients that this user is online
            io.emit("user:status", {
                userId,
                status: "online"
            });
        });

        // User sends a message
        socket.on("message:send", (data: {
            senderId: string;
            receiverId: string;
            content: string;
            messageId: string;
            createdAt: string;
        }) => {
            console.log(`Message from ${data.senderId} to ${data.receiverId}`);

            // Send to receiver if they're online
            const receiverSocketId = onlineUsers.get(data.receiverId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("message:receive", {
                    id: data.messageId,
                    senderId: data.senderId,
                    receiverId: data.receiverId,
                    content: data.content,
                    isRead: false,
                    createdAt: data.createdAt
                });
            }

            // Confirm to sender
            socket.emit("message:sent", {
                messageId: data.messageId,
                success: true
            });
        });

        // User starts typing
        socket.on("typing:start", (data: { userId: string; otherUserId: string }) => {
            const conversationKey = [data.userId, data.otherUserId].sort().join("-");

            if (!typingUsers.has(conversationKey)) {
                typingUsers.set(conversationKey, new Set());
            }
            typingUsers.get(conversationKey)!.add(data.userId);

            // Notify the other user
            const otherSocketId = onlineUsers.get(data.otherUserId);
            if (otherSocketId) {
                io.to(otherSocketId).emit("typing:status", {
                    userId: data.userId,
                    isTyping: true
                });
            }
        });

        // User stops typing
        socket.on("typing:stop", (data: { userId: string; otherUserId: string }) => {
            const conversationKey = [data.userId, data.otherUserId].sort().join("-");

            if (typingUsers.has(conversationKey)) {
                typingUsers.get(conversationKey)!.delete(data.userId);
                if (typingUsers.get(conversationKey)!.size === 0) {
                    typingUsers.delete(conversationKey);
                }
            }

            // Notify the other user
            const otherSocketId = onlineUsers.get(data.otherUserId);
            if (otherSocketId) {
                io.to(otherSocketId).emit("typing:status", {
                    userId: data.userId,
                    isTyping: false
                });
            }
        });

        // Message marked as read
        socket.on("message:read", (data: { messageId: string; userId: string }) => {
            // Broadcast to sender that their message was read
            io.emit("message:read:update", {
                messageId: data.messageId,
                readBy: data.userId
            });
        });

        // User disconnects
        socket.on("disconnect", () => {
            console.log(`Socket disconnected: ${socket.id}`);

            // Find and remove user from online users
            let disconnectedUserId: string | null = null;
            for (const [userId, socketId] of onlineUsers.entries()) {
                if (socketId === socket.id) {
                    disconnectedUserId = userId;
                    onlineUsers.delete(userId);
                    break;
                }
            }

            if (disconnectedUserId) {
                console.log(`User ${disconnectedUserId} is now offline`);

                // Broadcast to all clients that this user is offline
                io.emit("user:status", {
                    userId: disconnectedUserId,
                    status: "offline"
                });

                // Clean up typing status
                for (const [key, users] of typingUsers.entries()) {
                    users.delete(disconnectedUserId);
                    if (users.size === 0) {
                        typingUsers.delete(key);
                    }
                }
            }
        });
    });

    return io;
};

export { onlineUsers, typingUsers };
