import type { Request, Response } from "express";
import { dbClient } from "../../db/client.js";
import { usersTable, friendshipsTable, officialAccountsTable } from "../../db/schema.js";
import { eq, sql, or, and, inArray } from "drizzle-orm";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { getUserIdFromRequest } from "../utils/authUtils.js";
import { postsTable, postMediaTable, likesTable, marketItemsTable, marketCategoriesTable } from "../../db/schema.js";
import { uploadToSupabase, deleteFromSupabase } from "../utils/supabaseStorage.js";

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
        // sessionMiddleware ensures req.session.activeUserId is always present
        const currentUserId = req.session!.activeUserId;
        console.log("[getUserById] Start - target:", id, "current:", currentUserId);

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
        console.log("[getUserById] User found:", userData.username);

        const isOwnProfile = currentUserId === id && !userData.isAnonymous;

        // Check friendship status
        let friendshipStatus: "none" | "pending" | "accepted" | "blocked" = "none";
        let isPendingFrom: string | null = null;
        let mutualFriendsCount = 0;

        try {
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

            if (friendship.length > 0) {
                friendshipStatus = friendship[0].status as "pending" | "accepted" | "blocked";
                if (friendshipStatus === "pending") {
                    isPendingFrom = friendship[0].userId1 === currentUserId ? "me" : "them";
                }
            }
            console.log("[getUserById] Friendship status:", friendshipStatus);
        } catch (e) {
            console.error("[getUserById] Error fetching friendship:", e);
        }

        // Calculate mutual friends
        if (friendshipStatus === "accepted") {
            try {
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
                console.log("[getUserById] Mutual friends:", mutualFriendsCount);
            } catch (e) {
                console.error("[getUserById] Error calculating mutual friends:", e);
            }
        }

        // === ENHANCED DATA FETCHING ===

        // 1. Fetch user's posts (feed)
        let postsWithMedia: any[] = [];
        try {
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

            postsWithMedia = await Promise.all(posts.map(async (post) => {
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
            console.log("[getUserById] Posts fetched:", postsWithMedia.length);
        } catch (e) {
            console.error("[getUserById] Error fetching posts:", e);
        }

        // 2. Fetch user's market items
        let marketItems: any[] = [];
        try {
            marketItems = await dbClient
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
            console.log("[getUserById] Market items fetched:", marketItems.length);
        } catch (e) {
            console.error("[getUserById] Error fetching market items:", e);
        }

        // 3. Fetch friends list (with privacy check)
        const privacySettings = userData.privacySettings as any;
        const canShowFriends = isOwnProfile || privacySettings?.showFriends !== false;

        let friends: any[] | null = null;
        if (canShowFriends) {
            try {
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
                        .where(sql`${usersTable.id} IN (${sql.join(friendIds.map(fid => sql`${fid}`), sql`, `)})`)
                        .limit(50);
                } else {
                    friends = [];
                }
                console.log("[getUserById] Friends fetched:", friends?.length);
            } catch (e) {
                console.error("[getUserById] Error fetching friends:", e);
                friends = [];
            }
        }

        // 4. Fetch reposts
        let reposts: any[] = [];
        try {
            reposts = await dbClient
                .select({
                    id: postsTable.id,
                    content: postsTable.content,
                    createdAt: postsTable.createdAt,
                })
                .from(postsTable)
                .where(and(
                    eq(postsTable.userId, id),
                    eq(postsTable.category, "shared"),
                    eq(postsTable.status, "active")
                ))
                .orderBy(sql`${postsTable.createdAt} DESC`)
                .limit(10);
            console.log("[getUserById] Reposts fetched:", reposts.length);
        } catch (e) {
            console.error("[getUserById] Error fetching reposts:", e);
        }

        // 5. Fetch liked posts (with privacy check)
        const canShowLikedPosts = isOwnProfile || privacySettings?.showLikedPosts !== false;

        let likedPosts: any[] | null = null;
        if (canShowLikedPosts) {
            try {
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
                            sql`${postsTable.id} IN (${sql.join(postIds.map(pid => sql`${pid}`), sql`, `)})`,
                            eq(postsTable.status, "active")
                        ));
                } else {
                    likedPosts = [];
                }
                console.log("[getUserById] Liked posts fetched:", likedPosts?.length);
            } catch (e) {
                console.error("[getUserById] Error fetching liked posts:", e);
                likedPosts = [];
            }
        }

        // Calculate friends count
        let friendsCount = 0;
        if (friends !== null) {
            friendsCount = friends.length;
        } else {
            try {
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
            } catch (e) {
                console.error("[getUserById] Error counting friends:", e);
            }
        }

        console.log("[getUserById] Sending response");
        // Return comprehensive user profile
        res.json({
            ...userData,
            friendshipStatus,
            isPendingFrom,
            mutualFriendsCount,
            friendsCount,
            posts: postsWithMedia,
            marketItems,
            friends,
            reposts,
            likedPosts,
        });
    } catch (error) {
        console.error("[getUserById] FATAL ERROR:", error);
        console.error("[getUserById] Error stack:", error instanceof Error ? error.stack : 'No stack trace');
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

        // Log Activity
        await import("../utils/activityLogger.js").then(({ logActivity }) => {
            logActivity(userId, "Updated bio", `Updated bio`, req);
        });
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
        const newAvatarUrl = await uploadToSupabase("avatars", file);

        // Delete old file from Supabase if it was a Supabase URL
        if (oldAvatarUrl && oldAvatarUrl.includes("supabase")) {
            await deleteFromSupabase(oldAvatarUrl);
        } else if (oldAvatarUrl && oldAvatarUrl.startsWith("/uploads/")) {
            // Legacy: delete from disk
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

        // Log Activity
        await import("../utils/activityLogger.js").then(({ logActivity }) => {
            logActivity(userId, "Updated avatar", `Updated avatar`, req);
        });
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

        // Delete file from Supabase if it was a Supabase URL
        if (oldAvatarUrl && oldAvatarUrl.includes("supabase")) {
            await deleteFromSupabase(oldAvatarUrl);
        } else if (oldAvatarUrl && oldAvatarUrl.startsWith("/uploads/")) {
            // Legacy: delete from disk
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

// Update Banner
export const updateBanner = async (req: Request, res: Response) => {
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

        // Get existing user to check for old banner
        const existingUser = await dbClient
            .select()
            .from(usersTable)
            .where(eq(usersTable.id, userId))
            .limit(1);

        if (existingUser.length === 0) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        const oldBannerUrl = existingUser[0].bannerUrl;
        const newBannerUrl = await uploadToSupabase("uploads", file);

        // Delete old file from Supabase if it was a Supabase URL
        if (oldBannerUrl && oldBannerUrl.includes("supabase")) {
            await deleteFromSupabase(oldBannerUrl);
        } else if (oldBannerUrl && oldBannerUrl.startsWith("/uploads/")) {
            // Legacy: delete from disk
            const oldFilePath = path.join(process.cwd(), oldBannerUrl);
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
            }
        }

        const updatedUser = await dbClient
            .update(usersTable)
            .set({ bannerUrl: newBannerUrl })
            .where(eq(usersTable.id, userId))
            .returning();

        res.json({ message: "Banner updated successfully", user: updatedUser[0] });

        // Log Activity
        await import("../utils/activityLogger.js").then(({ logActivity }) => {
            logActivity(userId, "Updated banner", `Updated banner`, req);
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error updating banner" });
    }
};

// Delete Banner
export const deleteBanner = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        // Get existing user to check for old banner
        const existingUser = await dbClient
            .select()
            .from(usersTable)
            .where(eq(usersTable.id, userId))
            .limit(1);

        if (existingUser.length === 0) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        const oldBannerUrl = existingUser[0].bannerUrl;

        // Delete file from Supabase if it was a Supabase URL
        if (oldBannerUrl && oldBannerUrl.includes("supabase")) {
            await deleteFromSupabase(oldBannerUrl);
        } else if (oldBannerUrl && oldBannerUrl.startsWith("/uploads/")) {
            // Legacy: delete from disk
            const oldFilePath = path.join(process.cwd(), oldBannerUrl);
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
            }
        }

        const updatedUser = await dbClient
            .update(usersTable)
            .set({ bannerUrl: null })
            .where(eq(usersTable.id, userId))
            .returning();

        res.json({ message: "Banner deleted successfully", user: updatedUser[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error deleting banner" });
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

// Batch get users by IDs (for mention rendering)
export const batchGetUsers = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { ids } = req.query;
        if (!ids || typeof ids !== "string") {
            res.json([]);
            return;
        }

        const idList = ids
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean)
            .slice(0, 50); // max 50

        if (idList.length === 0) {
            res.json([]);
            return;
        }

        const users = await dbClient
            .select({
                id: usersTable.id,
                firstName: usersTable.firstName,
                lastName: usersTable.lastName,
                username: usersTable.username,
                avatarUrl: usersTable.avatarUrl,
            })
            .from(usersTable)
            .where(inArray(usersTable.id, idList));

        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching users" });
    }
};

// Get public official accounts — returns all official accounts with their user avatars
export const getPublicOfficialAccounts = async (req: Request, res: Response) => {
    try {
        const accounts = await dbClient
            .select({
                id: officialAccountsTable.id,
                name: officialAccountsTable.name,
                username: officialAccountsTable.username,
                faculty: officialAccountsTable.faculty,
                createdAt: officialAccountsTable.createdAt,
                userId: officialAccountsTable.userId,
                avatarUrl: usersTable.avatarUrl,
                bio: usersTable.bio,
            })
            .from(officialAccountsTable)
            .leftJoin(usersTable, eq(officialAccountsTable.userId, usersTable.id))
            .orderBy(officialAccountsTable.createdAt)
            .limit(100);

        res.json(accounts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching official accounts" });
    }
};
