import type { Request, Response } from "express";
import { dbClient } from "../../db/client.js";
import { usersTable, friendshipsTable } from "../../db/schema.js";
import { eq, sql, or, and } from "drizzle-orm";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { getUserIdFromRequest } from "../utils/authUtils.js";
import { postsTable, postMediaTable, likesTable, marketItemsTable, marketCategoriesTable } from "../../db/schema.js";

// Get all users
export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await dbClient.select().from(usersTable);
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching users" });
    }
};

// Get user by ID (with friendship status and comprehensive profile data)
export const getUserById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        let currentUserId = req.session?.activeUserId; // May be undefined if not logged in

        // Fallback: Try to get userId from JWT token directly (for testing)
        if (!currentUserId) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith("Bearer ")) {
                try {
                    const token = authHeader.split(" ")[1];
                    const jwtSecret = process.env.JWT_SECRET || "fallback_secret";
                    const decoded: any = jwt.verify(token, jwtSecret);
                    currentUserId = decoded.id;
                } catch (error) {
                    // Invalid token, continue as unauthenticated
                }
            }
        }

        const user = await dbClient
            .select()
            .from(usersTable)
            .where(eq(usersTable.id, id))
            .limit(1);

        if (user.length === 0) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        const userData = user[0];

        // If not logged in, return basic user info
        if (!currentUserId) {
            return res.json(userData);
        }

        const isOwnProfile = currentUserId === id && !userData.isAnonymous;

        // Check friendship status
        const friendship = await dbClient
            .select()
            .from(friendshipsTable)
            .where(
                or(
                    and(eq(friendshipsTable.userId1, currentUserId), eq(friendshipsTable.userId2, id)),
                    and(eq(friendshipsTable.userId1, id), eq(friendshipsTable.userId2, currentUserId))
                )
            )
            .limit(1);

        let friendshipStatus: "none" | "pending" | "accepted" | "blocked" = "none";
        let isPendingFrom: string | null = null;

        if (friendship.length > 0) {
            friendshipStatus = friendship[0].status as "pending" | "accepted" | "blocked";
            if (friendshipStatus === "pending") {
                isPendingFrom = friendship[0].userId1 === currentUserId ? "me" : "them";
            }
        }

        // Calculate mutual friends if they are friends
        let mutualFriendsCount = 0;
        if (friendshipStatus === "accepted") {
            const myFriendships = await dbClient
                .select()
                .from(friendshipsTable)
                .where(
                    and(
                        or(eq(friendshipsTable.userId1, currentUserId), eq(friendshipsTable.userId2, currentUserId)),
                        eq(friendshipsTable.status, "accepted")
                    )
                );

            const myFriendIds = myFriendships.map(f =>
                f.userId1 === currentUserId ? f.userId2 : f.userId1
            );

            const theirFriendships = await dbClient
                .select()
                .from(friendshipsTable)
                .where(
                    and(
                        or(eq(friendshipsTable.userId1, id), eq(friendshipsTable.userId2, id)),
                        eq(friendshipsTable.status, "accepted")
                    )
                );

            const theirFriendIds = theirFriendships.map(f =>
                f.userId1 === id ? f.userId2 : f.userId1
            );

            mutualFriendsCount = myFriendIds.filter(fid => theirFriendIds.includes(fid)).length;
        }

        // === ENHANCED DATA FETCHING ===

        // 1. Fetch user's posts (feed)
        const posts = await dbClient
            .select({
                id: postsTable.id,
                content: postsTable.content,
                category: postsTable.category,
                likeCount: postsTable.likeCount,
                commentCount: postsTable.commentCount,
                createdAt: postsTable.createdAt,
            })
            .from(postsTable)
            .where(and(
                eq(postsTable.userId, id),
                eq(postsTable.status, "active")
            ))
            .orderBy(sql`${postsTable.createdAt} DESC`)
            .limit(20);

        // Get media for each post
        const postsWithMedia = await Promise.all(posts.map(async (post) => {
            const media = await dbClient
                .select()
                .from(postMediaTable)
                .where(eq(postMediaTable.postId, post.id));

            const isLiked = currentUserId ? await dbClient
                .select()
                .from(likesTable)
                .where(and(
                    eq(likesTable.postId, post.id),
                    eq(likesTable.userId, currentUserId)
                ))
                .limit(1)
                .then(res => res.length > 0) : false;

            return {
                ...post,
                mediaUrls: media.map(m => m.mediaUrl),
                isLiked,
            };
        }));

        // 2. Fetch user's market items
        const marketItems = await dbClient
            .select({
                id: marketItemsTable.id,
                title: marketItemsTable.title,
                description: marketItemsTable.description,
                price: marketItemsTable.price,
                imageUrl: marketItemsTable.imageUrl,
                imageUrls: marketItemsTable.imageUrls,
                status: marketItemsTable.status,
                createdAt: marketItemsTable.createdAt,
                category: {
                    id: marketCategoriesTable.id,
                    name: marketCategoriesTable.name,
                }
            })
            .from(marketItemsTable)
            .leftJoin(marketCategoriesTable, eq(marketItemsTable.categoryId, marketCategoriesTable.id))
            .where(eq(marketItemsTable.sellerId, id))
            .orderBy(sql`${marketItemsTable.createdAt} DESC`)
            .limit(20);

        // 3. Fetch friends list (with privacy check)
        const privacySettings = userData.privacySettings as any;
        const canShowFriends = isOwnProfile || privacySettings?.showFriends !== false;

        let friends = null;
        if (canShowFriends) {
            const friendships = await dbClient
                .select()
                .from(friendshipsTable)
                .where(
                    and(
                        or(eq(friendshipsTable.userId1, id), eq(friendshipsTable.userId2, id)),
                        eq(friendshipsTable.status, "accepted")
                    )
                );

            const friendIds = friendships.map(f => f.userId1 === id ? f.userId2 : f.userId1);

            if (friendIds.length > 0) {
                friends = await dbClient
                    .select({
                        id: usersTable.id,
                        firstName: usersTable.firstName,
                        lastName: usersTable.lastName,
                        avatarUrl: usersTable.avatarUrl,
                        faculty: usersTable.faculty,
                    })
                    .from(usersTable)
                    .where(sql`${usersTable.id} IN ${friendIds}`)
                    .limit(50);
            } else {
                friends = [];
            }
        }

        // 4. Fetch reposts (posts where this user shared/reposted)
        // Note: Repost functionality needs to be implemented in posts table
        const reposts = await dbClient
            .select({
                id: postsTable.id,
                content: postsTable.content,
                createdAt: postsTable.createdAt,
            })
            .from(postsTable)
            .where(and(
                eq(postsTable.userId, id),
                eq(postsTable.category, "shared"), // Assuming 'shared' category for reposts
                eq(postsTable.status, "active")
            ))
            .orderBy(sql`${postsTable.createdAt} DESC`)
            .limit(10);

        // 5. Fetch liked posts (with privacy check)
        const canShowLikedPosts = isOwnProfile || privacySettings?.showLikedPosts !== false;

        let likedPosts = null;
        if (canShowLikedPosts) {
            const likes = await dbClient
                .select({
                    postId: likesTable.postId,
                    createdAt: likesTable.createdAt,
                })
                .from(likesTable)
                .where(eq(likesTable.userId, id))
                .orderBy(sql`${likesTable.createdAt} DESC`)
                .limit(20);

            if (likes.length > 0) {
                const postIds = likes.map(l => l.postId);
                likedPosts = await dbClient
                    .select({
                        id: postsTable.id,
                        content: postsTable.content,
                        likeCount: postsTable.likeCount,
                        createdAt: postsTable.createdAt,
                        author: {
                            id: usersTable.id,
                            firstName: usersTable.firstName,
                            lastName: usersTable.lastName,
                            avatarUrl: usersTable.avatarUrl,
                        }
                    })
                    .from(postsTable)
                    .innerJoin(usersTable, eq(postsTable.userId, usersTable.id))
                    .where(and(
                        sql`${postsTable.id} = ANY(ARRAY[${sql.join(postIds.map(id => sql`${id}`), sql`, `)}])`,
                        eq(postsTable.status, "active")
                    ));
            } else {
                likedPosts = [];
            }
        }

        // Calculate friends count (always visible, even if friends list is private)
        let friendsCount = 0;
        if (friends !== null) {
            friendsCount = friends.length;
        } else {
            // If friends list is private, still calculate count
            const countFriendships = await dbClient
                .select()
                .from(friendshipsTable)
                .where(
                    and(
                        or(eq(friendshipsTable.userId1, id), eq(friendshipsTable.userId2, id)),
                        eq(friendshipsTable.status, "accepted")
                    )
                );
            friendsCount = countFriendships.length;
        }

        // Return comprehensive user profile
        res.json({
            ...userData,
            friendshipStatus,
            isPendingFrom,
            mutualFriendsCount,
            friendsCount, // Always visible
            posts: postsWithMedia,
            marketItems,
            friends, // null if privacy disallows
            reposts,
            likedPosts, // null if privacy disallows
        });
    } catch (error) {
        console.error("Error in getUserById:", error);
        console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
        res.status(500).json({ message: "Error fetching user" });
    }
};

// Create a user (simplified for demo)
export const createUser = async (req: Request, res: Response) => {
    try {
        const { firstName, lastName, email, username } = req.body;
        const newUser = await dbClient
            .insert(usersTable)
            .values({
                firstName,
                lastName,
                email,
                username,
            })
            .returning();
        res.status(201).json(newUser[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error creating user" });
    }
};

// Delete a user
export const deleteUser = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const deletedUser = await dbClient
            .delete(usersTable)
            .where(eq(usersTable.id, userId))
            .returning();

        if (deletedUser.length === 0) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        res.json({ message: "User deleted successfully", user: deletedUser[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error deleting user" });
    }
};

// Update Bio
export const updateBio = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { bio } = req.body;
        if (bio === undefined) {
            res.status(400).json({ message: "Bio is required" });
            return;
        }

        const updatedUser = await dbClient
            .update(usersTable)
            .set({ bio })
            .where(eq(usersTable.id, userId))
            .returning();

        if (updatedUser.length === 0) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        res.json({ message: "Bio updated successfully", user: updatedUser[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error updating bio" });
    }
};

// Update Avatar (Picture)
export const updateAvatar = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const file = req.file;
        if (!file) {
            res.status(400).json({ message: "No image file provided" });
            return;
        }

        // Get existing user to check for old avatar
        const existingUser = await dbClient
            .select()
            .from(usersTable)
            .where(eq(usersTable.id, userId))
            .limit(1);

        if (existingUser.length === 0) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        const oldAvatarUrl = existingUser[0].avatarUrl;
        const newAvatarUrl = `/uploads/${file.filename}`;

        // Delete old file if it's a local upload
        if (oldAvatarUrl && oldAvatarUrl.startsWith("/uploads/")) {
            const oldFilePath = path.join(process.cwd(), oldAvatarUrl);
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
            }
        }

        const updatedUser = await dbClient
            .update(usersTable)
            .set({ avatarUrl: newAvatarUrl })
            .where(eq(usersTable.id, userId))
            .returning();

        res.json({ message: "Avatar updated successfully", user: updatedUser[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error updating avatar" });
    }
};

// Delete Avatar (Picture)
export const deleteAvatar = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        // Get existing user to check for old avatar
        const existingUser = await dbClient
            .select()
            .from(usersTable)
            .where(eq(usersTable.id, userId))
            .limit(1);

        if (existingUser.length === 0) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        const oldAvatarUrl = existingUser[0].avatarUrl;

        // Delete file if it's a local upload
        if (oldAvatarUrl && oldAvatarUrl.startsWith("/uploads/")) {
            const oldFilePath = path.join(process.cwd(), oldAvatarUrl);
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
            }
        }

        const updatedUser = await dbClient
            .update(usersTable)
            .set({ avatarUrl: null })
            .where(eq(usersTable.id, userId))
            .returning();

        res.json({ message: "Avatar deleted successfully", user: updatedUser[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error deleting avatar" });
    }
};

// Search Users
export const searchUsers = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { query } = req.query;

        if (!query || typeof query !== "string") {
            res.status(400).json({ message: "Search query is required" });
            return;
        }

        // Remove @ prefix if searching by username
        const searchTerm = query.trim().replace(/^@/, "");

        if (searchTerm.length === 0) {
            res.json([]);
            return;
        }

        // Search by firstName, lastName, username, or studentId (case-insensitive)
        const users = await dbClient
            .select({
                id: usersTable.id,
                firstName: usersTable.firstName,
                lastName: usersTable.lastName,
                username: usersTable.username,
                studentId: usersTable.studentId,
                avatarUrl: usersTable.avatarUrl,
                bio: usersTable.bio,
                faculty: usersTable.faculty,
                major: usersTable.major,
                year: usersTable.year,
                friendsCount: usersTable.friendsCount,
            })
            .from(usersTable)
            .where(
                sql`(
                    LOWER(${usersTable.firstName}) LIKE LOWER(${`%${searchTerm}%`}) OR
                    LOWER(${usersTable.lastName}) LIKE LOWER(${`%${searchTerm}%`}) OR
                    LOWER(${usersTable.username}) LIKE LOWER(${`%${searchTerm}%`}) OR
                    LOWER(${usersTable.studentId}) LIKE LOWER(${`%${searchTerm}%`}) OR
                    LOWER(CONCAT(${usersTable.firstName}, ' ', ${usersTable.lastName})) LIKE LOWER(${`%${searchTerm}%`})
                ) AND ${usersTable.id} != ${userId}`
            )
            .limit(20); // Limit to 20 results

        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error searching users" });
    }
};
