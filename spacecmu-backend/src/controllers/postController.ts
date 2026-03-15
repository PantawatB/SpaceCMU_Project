import type { Request, Response } from "express";
import { dbClient } from "../../db/client.js";
import { postsTable, commentsTable, commentMediaTable, commentLikesTable, likesTable, savedPostsTable, usersTable, repostsTable, postMediaTable, friendshipsTable, eventPostsTable, calendarEventsTable, followsTable, notificationsTable } from "../../db/schema.js";
import { eq, desc, asc, and, sql, lt, ne, inArray, gt } from "drizzle-orm";
import { getUserIdFromRequest } from "../utils/authUtils.js";
import { createNotificationIfNotDuplicate, sendMentionNotifications, resolveMentionsInText } from "../utils/notificationUtils.js";

// --- Post Management ---

export const getAllPosts = async (req: Request, res: Response) => {
    try {
        const { category, cursor, limit: limitParam } = req.query;
        const userId = req.session?.activeUserId;

        // Pagination settings
        const limit = Math.min(parseInt(limitParam as string) || 20, 50); // Default 20, max 50
        const cursorDate = cursor ? new Date(cursor as string) : null;

        let postsQuery = dbClient
            .select({
                // Post fields
                id: postsTable.id,
                userId: postsTable.userId,
                content: postsTable.content,
                imageUrl: postsTable.imageUrl,
                mediaUrl: postsTable.mediaUrl,
                mediaType: postsTable.mediaType,
                category: postsTable.category,
                likeCount: postsTable.likeCount,
                commentCount: postsTable.commentCount,
                repostCount: postsTable.repostCount,
                shareCount: postsTable.shareCount,
                status: postsTable.status,
                createdAt: postsTable.createdAt,
                updatedAt: postsTable.updatedAt,
                // Author info
                authorFirstName: usersTable.firstName,
                authorLastName: usersTable.lastName,
                authorAvatarUrl: usersTable.avatarUrl,
                authorRole: usersTable.role,
            })
            .from(postsTable)
            .leftJoin(usersTable, eq(postsTable.userId, usersTable.id))
            .orderBy(desc(postsTable.createdAt));

        // Apply category filter
        if (category && category !== 'Global') {
            if (category === 'Friends') {
                // Friends feed: Show only posts from friends
                if (!userId) {
                    return res.json([]); // Not logged in = no friends feed
                }

                // Get user's friends
                const friendships = await dbClient
                    .select()
                    .from(friendshipsTable)
                    .where(
                        and(
                            eq(friendshipsTable.status, 'accepted'),
                            sql`(${friendshipsTable.userId1} = ${userId} OR ${friendshipsTable.userId2} = ${userId})`
                        )
                    );

                const friendIds = friendships.map(f =>
                    f.userId1 === userId ? f.userId2 : f.userId1
                );

                if (friendIds.length === 0) {
                    return res.json([]); // No friends = empty feed
                }

                // Filter posts: any post by a friend EXCEPT posts the friend marked
                // as 'Friends' category that the viewer can already see anyway.
                // Rule: show ALL posts from friends regardless of category.
                const friendsWhereCondition = cursorDate
                    ? and(
                        sql`${postsTable.userId} IN (${sql.join(friendIds.map(id => sql`${id}`), sql`, `)})`,
                        ne(postsTable.status, 'banned'),
                        lt(postsTable.createdAt, cursorDate)
                    )
                    : and(
                        sql`${postsTable.userId} IN (${sql.join(friendIds.map(id => sql`${id}`), sql`, `)})`,
                        ne(postsTable.status, 'banned')
                    );

                const posts = await dbClient
                    .select({
                        id: postsTable.id,
                        userId: postsTable.userId,
                        content: postsTable.content,
                        imageUrl: postsTable.imageUrl,
                        mediaUrl: postsTable.mediaUrl,
                        mediaType: postsTable.mediaType,
                        category: postsTable.category,
                        likeCount: postsTable.likeCount,
                        commentCount: postsTable.commentCount,
                        repostCount: postsTable.repostCount,
                shareCount: postsTable.shareCount,
                        status: postsTable.status,
                        createdAt: postsTable.createdAt,
                        updatedAt: postsTable.updatedAt,
                        authorFirstName: usersTable.firstName,
                        authorLastName: usersTable.lastName,
                        authorAvatarUrl: usersTable.avatarUrl,
                        authorRole: usersTable.role,
                    })
                    .from(postsTable)
                    .leftJoin(usersTable, eq(postsTable.userId, usersTable.id))
                    .where(friendsWhereCondition)
                    .orderBy(desc(postsTable.createdAt))
                    .limit(limit + 1);

                const hasMore = posts.length > limit;
                const postsToReturn = hasMore ? posts.slice(0, limit) : posts;

                // Fetch media for each post
                const postsWithMedia = await Promise.all(
                    postsToReturn.map(async (post) => {
                        const media = await dbClient
                            .select()
                            .from(postMediaTable)
                            .where(eq(postMediaTable.postId, post.id))
                            .orderBy(postMediaTable.order);

                        const { authorFirstName, authorLastName, authorAvatarUrl, authorRole, ...postData } = post;
                        return {
                            ...postData,
                            author: {
                                firstName: authorFirstName,
                                lastName: authorLastName,
                                avatarUrl: authorAvatarUrl,
                                role: authorRole,
                            },
                            media: media.length > 0 ? media : undefined,
                        };
                    })
                );

                const nextCursor = hasMore && postsToReturn.length > 0
                    ? postsToReturn[postsToReturn.length - 1].createdAt.toISOString()
                    : null;

                return res.json({
                    posts: postsWithMedia,
                    nextCursor,
                    hasMore,
                });
            } else if (category === 'Follow' || category === 'Following') {
                // Following feed: Show posts from followed users.
                // Friends-category posts are shown only if viewer is also friends with that user.
                if (!userId) {
                    return res.json([]); // Not logged in = no follow feed
                }

                // Get users whom this user follows
                const follows = await dbClient
                    .select()
                    .from(followsTable)
                    .where(eq(followsTable.followerId, userId));

                const followingIds = follows.map(f => f.followingId);

                if (followingIds.length === 0) {
                    return res.json([]); // No followings = empty feed
                }

                // Also get the viewer's friends (to allow Friends-category posts from them)
                const friendships = await dbClient
                    .select()
                    .from(friendshipsTable)
                    .where(
                        and(
                            eq(friendshipsTable.status, 'accepted'),
                            sql`(${friendshipsTable.userId1} = ${userId} OR ${friendshipsTable.userId2} = ${userId})`
                        )
                    );
                const friendIds = friendships.map(f =>
                    f.userId1 === userId ? f.userId2 : f.userId1
                );

                // followingIds that are also friends → can see their Friends-category posts
                const followingFriendIds = followingIds.filter(id => friendIds.includes(id));

                // Build where condition:
                // Show post if: poster is followed AND (category != Friends OR poster is also a friend)
                let whereCondition;
                if (followingFriendIds.length > 0) {
                    whereCondition = cursorDate
                        ? and(
                            sql`${postsTable.userId} IN (${sql.join(followingIds.map(id => sql`${id}`), sql`, `)})`,
                            sql`(${postsTable.category} <> 'Friends' OR ${postsTable.userId} IN (${sql.join(followingFriendIds.map(id => sql`${id}`), sql`, `)}))`,
                            ne(postsTable.status, 'banned'),
                            lt(postsTable.createdAt, cursorDate)
                        )
                        : and(
                            sql`${postsTable.userId} IN (${sql.join(followingIds.map(id => sql`${id}`), sql`, `)})`,
                            sql`(${postsTable.category} <> 'Friends' OR ${postsTable.userId} IN (${sql.join(followingFriendIds.map(id => sql`${id}`), sql`, `)}))`,
                            ne(postsTable.status, 'banned')
                        );
                } else {
                    whereCondition = cursorDate
                        ? and(
                            sql`${postsTable.userId} IN (${sql.join(followingIds.map(id => sql`${id}`), sql`, `)})`,
                            ne(postsTable.category, 'Friends'),
                            ne(postsTable.status, 'banned'),
                            lt(postsTable.createdAt, cursorDate)
                        )
                        : and(
                            sql`${postsTable.userId} IN (${sql.join(followingIds.map(id => sql`${id}`), sql`, `)})`,
                            ne(postsTable.category, 'Friends'),
                            ne(postsTable.status, 'banned')
                        );
                }

                const posts = await dbClient
                    .select({
                        id: postsTable.id,
                        userId: postsTable.userId,
                        content: postsTable.content,
                        imageUrl: postsTable.imageUrl,
                        mediaUrl: postsTable.mediaUrl,
                        mediaType: postsTable.mediaType,
                        category: postsTable.category,
                        likeCount: postsTable.likeCount,
                        commentCount: postsTable.commentCount,
                        repostCount: postsTable.repostCount,
                shareCount: postsTable.shareCount,
                        status: postsTable.status,
                        createdAt: postsTable.createdAt,
                        updatedAt: postsTable.updatedAt,
                        authorFirstName: usersTable.firstName,
                        authorLastName: usersTable.lastName,
                        authorAvatarUrl: usersTable.avatarUrl,
                        authorRole: usersTable.role,
                    })
                    .from(postsTable)
                    .leftJoin(usersTable, eq(postsTable.userId, usersTable.id))
                    .where(whereCondition)
                    .orderBy(desc(postsTable.createdAt))
                    .limit(limit + 1);

                const hasMore = posts.length > limit;
                const postsToReturn = hasMore ? posts.slice(0, limit) : posts;

                // Fetch media for each post
                const postsWithMedia = await Promise.all(
                    postsToReturn.map(async (post) => {
                        const media = await dbClient
                            .select()
                            .from(postMediaTable)
                            .where(eq(postMediaTable.postId, post.id))
                            .orderBy(postMediaTable.order);

                        const { authorFirstName, authorLastName, authorAvatarUrl, authorRole, ...postData } = post;
                        return {
                            ...postData,
                            author: {
                                firstName: authorFirstName,
                                lastName: authorLastName,
                                avatarUrl: authorAvatarUrl,
                                role: authorRole,
                            },
                            media: media.length > 0 ? media : undefined,
                        };
                    })
                );

                const nextCursor = hasMore && postsToReturn.length > 0
                    ? postsToReturn[postsToReturn.length - 1].createdAt.toISOString()
                    : null;

                return res.json({
                    posts: postsWithMedia,
                    nextCursor,
                    hasMore,
                });
            } else {
                // Other categories: Announcements, Events, Questions, Marketplaces, Shops
                const otherWhereCondition = cursorDate
                    ? and(eq(postsTable.category, category as string), ne(postsTable.status, 'banned'), lt(postsTable.createdAt, cursorDate))
                    : and(eq(postsTable.category, category as string), ne(postsTable.status, 'banned'));

                const posts = await dbClient
                    .select({
                        id: postsTable.id,
                        userId: postsTable.userId,
                        content: postsTable.content,
                        imageUrl: postsTable.imageUrl,
                        mediaUrl: postsTable.mediaUrl,
                        mediaType: postsTable.mediaType,
                        category: postsTable.category,
                        likeCount: postsTable.likeCount,
                        commentCount: postsTable.commentCount,
                        repostCount: postsTable.repostCount,
                shareCount: postsTable.shareCount,
                        status: postsTable.status,
                        createdAt: postsTable.createdAt,
                        updatedAt: postsTable.updatedAt,
                        authorFirstName: usersTable.firstName,
                        authorLastName: usersTable.lastName,
                        authorAvatarUrl: usersTable.avatarUrl,
                        authorRole: usersTable.role,
                    })
                    .from(postsTable)
                    .leftJoin(usersTable, eq(postsTable.userId, usersTable.id))
                    .where(otherWhereCondition)
                    .orderBy(desc(postsTable.createdAt))
                    .limit(limit + 1);

                const hasMore = posts.length > limit;
                const postsToReturn = hasMore ? posts.slice(0, limit) : posts;

                // Fetch media for each post
                const postsWithMedia = await Promise.all(
                    postsToReturn.map(async (post) => {
                        const media = await dbClient
                            .select()
                            .from(postMediaTable)
                            .where(eq(postMediaTable.postId, post.id))
                            .orderBy(postMediaTable.order);

                        const { authorFirstName, authorLastName, authorAvatarUrl, authorRole, ...postData } = post;
                        return {
                            ...postData,
                            author: {
                                firstName: authorFirstName,
                                lastName: authorLastName,
                                avatarUrl: authorAvatarUrl,
                                role: authorRole,
                            },
                            media: media.length > 0 ? media : undefined,
                        };
                    })
                );

                const nextCursor = hasMore && postsToReturn.length > 0
                    ? postsToReturn[postsToReturn.length - 1].createdAt.toISOString()
                    : null;

                return res.json({
                    posts: postsWithMedia,
                    nextCursor,
                    hasMore,
                });
            }
        }

        // Global feed: All posts except Friends category
        // Build where conditions
        const whereConditions = cursorDate
            ? and(
                sql`${postsTable.category} != 'Friends'`,
                lt(postsTable.createdAt, cursorDate)
            )
            : sql`${postsTable.category} != 'Friends'`;

        const posts = await dbClient
            .select({
                id: postsTable.id,
                userId: postsTable.userId,
                content: postsTable.content,
                imageUrl: postsTable.imageUrl,
                mediaUrl: postsTable.mediaUrl,
                mediaType: postsTable.mediaType,
                category: postsTable.category,
                likeCount: postsTable.likeCount,
                commentCount: postsTable.commentCount,
                repostCount: postsTable.repostCount,
                shareCount: postsTable.shareCount,
                status: postsTable.status,
                createdAt: postsTable.createdAt,
                updatedAt: postsTable.updatedAt,
                authorFirstName: usersTable.firstName,
                authorLastName: usersTable.lastName,
                authorAvatarUrl: usersTable.avatarUrl,
                authorRole: usersTable.role,
            })
            .from(postsTable)
            .leftJoin(usersTable, eq(postsTable.userId, usersTable.id))
            .where(and(whereConditions, ne(postsTable.status, 'banned')))
            .orderBy(desc(postsTable.createdAt))
            .limit(limit + 1); // Fetch one extra to check if there's more

        // Check if there are more posts
        const hasMore = posts.length > limit;
        const postsToReturn = hasMore ? posts.slice(0, limit) : posts;

        // Fetch media for each post
        const postsWithMedia = await Promise.all(
            postsToReturn.map(async (post) => {
                const media = await dbClient
                    .select()
                    .from(postMediaTable)
                    .where(eq(postMediaTable.postId, post.id))
                    .orderBy(postMediaTable.order);

                const { authorFirstName, authorLastName, authorAvatarUrl, authorRole, ...postData } = post;
                return {
                    ...postData,
                    author: {
                        firstName: authorFirstName,
                        lastName: authorLastName,
                        avatarUrl: authorAvatarUrl,
                        role: authorRole,
                    },
                    media: media.length > 0 ? media : undefined,
                };
            })
        );

        // Get next cursor from last post's createdAt
        const nextCursor = hasMore && postsToReturn.length > 0
            ? postsToReturn[postsToReturn.length - 1].createdAt.toISOString()
            : null;

        res.json({
            posts: postsWithMedia,
            nextCursor,
            hasMore,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching posts" });
    }
};

export const createPost = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { content, imageUrl, mediaUrl, mediaType, category } = req.body;
        const newPost = await dbClient
            .insert(postsTable)
            .values({
                userId,
                content,
                imageUrl, // Deprecated but kept for safety
                mediaUrl,
                mediaType: mediaType || "image",
                category: category || "Global",
            })
            .returning();

        // Log Activity
        await import("../utils/activityLogger.js").then(({ logActivity }) => {
            logActivity(userId, "Created post", `Created a post with content: ${content?.substring(0, 50)}...`, req);
        });

        res.status(201).json(newPost[0]);
    } catch (error: any) {
        console.error("DEBUG createPost Error:", error);
        res.status(500).json({
            message: "Error creating post",
            error: error.message,
            stack: error.stack
        });
    }
};

// Create post with multiple media files
export const createPostWithMedia = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { content, category, eventTitle, eventDescription, eventStartTime, eventEndTime, eventType } = req.body;
        const files = req.files as Express.Multer.File[];

        // 1. Create post
        const [newPost] = await dbClient
            .insert(postsTable)
            .values({
                userId,
                content,
                category: category || "Global",
            })
            .returning();

        // 2. Insert media if files were uploaded
        if (files && files.length > 0) {
            const mediaValues = files.map((file, index) => {
                const mediaType = file.mimetype.startsWith("video/") ? "video" : "image";
                return {
                    postId: newPost.id,
                    mediaUrl: `/uploads/${file.filename}`,
                    mediaType,
                    order: index,
                    fileSize: file.size,
                };
            });

            await dbClient.insert(postMediaTable).values(mediaValues);
        }

        // 3. Create event post if event data is provided
        if (eventTitle && eventStartTime) {
            await dbClient.insert(eventPostsTable).values({
                postId: newPost.id,
                eventTitle,
                eventDescription: eventDescription || null,
                eventStartTime: new Date(eventStartTime),
                eventEndTime: eventEndTime ? new Date(eventEndTime) : null,
                eventType: eventType || "event",
            });
        }

        // 4. Fetch complete post with media
        const media = await dbClient
            .select()
            .from(postMediaTable)
            .where(eq(postMediaTable.postId, newPost.id))
            .orderBy(postMediaTable.order);



        // Log Activity
        await import("../utils/activityLogger.js").then(({ logActivity }) => {
            logActivity(userId, "Created media post", `Created a post with media/event`, req);
        });

        // Send mention notifications for @[userId] tags in post content
        if (content?.trim()) {
            await sendMentionNotifications({
                text: content,
                senderId: userId,
                referenceId: newPost.id,
                sourceType: "post",
            });
        }

        res.status(201).json({
            ...newPost,
            media: media,
        });
    } catch (error: any) {
        console.error("createPostWithMedia Error:", error);
        res.status(500).json({
            message: "Error creating post",
            error: error.message,
        });
    }
};

// Delete post
export const deletePost = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { postId } = req.params;

        // Verify post belongs to user
        const post = await dbClient
            .select()
            .from(postsTable)
            .where(eq(postsTable.id, postId))
            .limit(1);

        if (post.length === 0) {
            return res.status(404).json({ message: "Post not found" });
        }

        if (post[0].userId !== userId) {
            return res.status(403).json({ message: "Forbidden: You can only delete your own posts" });
        }

        // Delete post (media will be cascade deleted due to foreign key)
        await dbClient
            .delete(postsTable)
            .where(eq(postsTable.id, postId));

        res.json({ message: "Post deleted successfully" });

        // Log Activity
        await import("../utils/activityLogger.js").then(({ logActivity }) => {
            logActivity(userId, "Deleted post", `Deleted post ID: ${postId}`, req);
        });
    } catch (error) {
        console.error("deletePost Error:", error);
        res.status(500).json({ message: "Error deleting post" });
    }
};

// Edit post (content + optional media replacement)
export const editPost = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { postId } = req.params;
        const { content, removeMediaIds } = req.body;
        const files = req.files as Express.Multer.File[] | undefined;

        // Verify post belongs to user
        const [post] = await dbClient
            .select()
            .from(postsTable)
            .where(eq(postsTable.id, postId))
            .limit(1);

        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        if (post.userId !== userId) {
            return res.status(403).json({ message: "Forbidden: You can only edit your own posts" });
        }

        // Update content
        await dbClient
            .update(postsTable)
            .set({ content: content ?? post.content })
            .where(eq(postsTable.id, postId));

        // Remove selected existing media
        if (removeMediaIds) {
            const idsToRemove: string[] = Array.isArray(removeMediaIds) ? removeMediaIds : [removeMediaIds];
            if (idsToRemove.length > 0) {
                await dbClient
                    .delete(postMediaTable)
                    .where(
                        and(
                            eq(postMediaTable.postId, postId),
                            inArray(postMediaTable.id, idsToRemove)
                        )
                    );
            }
        }

        // Append new media files if provided
        if (files && files.length > 0) {
            // Get current max order
            const existing = await dbClient
                .select({ order: postMediaTable.order })
                .from(postMediaTable)
                .where(eq(postMediaTable.postId, postId))
                .orderBy(desc(postMediaTable.order))
                .limit(1);

            let nextOrder = existing.length > 0 ? (existing[0].order + 1) : 0;

            const mediaValues = files.map((file) => {
                const mediaType = file.mimetype.startsWith("video/") ? "video" : "image";
                return {
                    postId,
                    mediaUrl: `/uploads/${file.filename}`,
                    mediaType,
                    order: nextOrder++,
                    fileSize: file.size,
                };
            });

            await dbClient.insert(postMediaTable).values(mediaValues);
        }

        // Return updated post with all media
        const [updatedPost] = await dbClient
            .select()
            .from(postsTable)
            .where(eq(postsTable.id, postId))
            .limit(1);

        const media = await dbClient
            .select()
            .from(postMediaTable)
            .where(eq(postMediaTable.postId, postId))
            .orderBy(postMediaTable.order);

        // Log Activity
        await import("../utils/activityLogger.js").then(({ logActivity }) => {
            logActivity(userId, "Edited post", `Edited post ID: ${postId}`, req);
        });

        // Send mention notifications for any @[userId] tags in the updated content
        if (content?.trim()) {
            await sendMentionNotifications({
                text: content,
                senderId: userId,
                referenceId: postId,
                sourceType: "post",
            });
        }

        res.json({ ...updatedPost, media });
    } catch (error) {
        console.error("editPost Error:", error);
        res.status(500).json({ message: "Error editing post" });
    }
};

// --- Interactions ---

export const likePost = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        const { postId } = req.body;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const existingLike = await dbClient
            .select()
            .from(likesTable)
            .where(
                and(
                    eq(likesTable.userId, userId),
                    eq(likesTable.postId, postId)
                )
            );

        if (existingLike.length > 0) {
            // Unlike
            await dbClient
                .delete(likesTable)
                .where(
                    and(
                        eq(likesTable.userId, userId),
                        eq(likesTable.postId, postId)
                    )
                );

            // Decrement like count in postsTable
            await dbClient
                .update(postsTable)
                .set({ likeCount: sql`${postsTable.likeCount} - 1` })
                .where(eq(postsTable.id, postId));

            // Get updated post to return new like count
            const updatedPost = await dbClient
                .select({ likeCount: postsTable.likeCount })
                .from(postsTable)
                .where(eq(postsTable.id, postId))
                .limit(1);

            return res.status(200).json({
                message: "Unliked",
                likeCount: updatedPost[0]?.likeCount || 0
            });

        } else {
            // Like
            await dbClient
                .insert(likesTable)
                .values({ userId, postId })
                .returning();

            // Increment like count in postsTable
            await dbClient
                .update(postsTable)
                .set({ likeCount: sql`${postsTable.likeCount} + 1` })
                .where(eq(postsTable.id, postId));

            // Get updated post to return new like count
            const updatedPost = await dbClient
                .select({ likeCount: postsTable.likeCount })
                .from(postsTable)
                .where(eq(postsTable.id, postId))
                .limit(1);

            // Log Activity
            await import("../utils/activityLogger.js").then(({ logActivity }) => {
                logActivity(userId, "Liked post", `Liked post ID: ${postId}`, req);
            });

            // Create notification for post owner (don't notify yourself)
            const post = await dbClient
                .select({ userId: postsTable.userId })
                .from(postsTable)
                .where(eq(postsTable.id, postId))
                .limit(1);
            const postOwnerId = post[0]?.userId;
            if (postOwnerId && postOwnerId !== userId) {
                await createNotificationIfNotDuplicate({
                    recipientId: postOwnerId,
                    senderId: userId,
                    type: "like",
                    referenceId: postId,
                    message: null,
                });
            }

            return res.status(201).json({
                message: "Liked",
                likeCount: updatedPost[0]?.likeCount || 0
            });
        }

    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: "Error toggling like" });
    }
};

export const addComment = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        const { postId, content, parentCommentId } = req.body;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Validate postId
        if (!postId) {
            return res.status(400).json({ message: "postId is required" });
        }

        // Create the comment
        const newComment = await dbClient
            .insert(commentsTable)
            .values({
                userId,
                postId: String(postId),
                content: content || '',
                parentCommentId: parentCommentId ? String(parentCommentId) : null,
            })
            .returning();

        const commentId = newComment[0].id;

        // Handle media uploads if present
        const files = req.files as Express.Multer.File[];
        if (files && files.length > 0) {
            const mediaValues = files.map((file, index) => {
                const mediaType = file.mimetype.startsWith("video/") ? "video" : "image";
                const mediaUrl = `/uploads/${file.filename}`;
                return {
                    commentId,
                    mediaUrl,
                    mediaType,
                    order: index,
                };
            });

            // Insert all media entries
            await dbClient.insert(commentMediaTable).values(mediaValues);
        }

        // Increment comment count in postsTable (both top-level and replies)
        await dbClient
            .update(postsTable)
            .set({ commentCount: sql`${postsTable.commentCount} + 1` })
            .where(eq(postsTable.id, String(postId)));

        res.status(201).json(newComment[0]);

        // Log Activity
        await import("../utils/activityLogger.js").then(({ logActivity }) => {
            logActivity(userId, "Added comment", `Commented on post ${postId}: ${content?.substring(0, 50)}...`, req);
        });

        // Create notification for post owner (comment) or parent comment owner (reply)
        if (parentCommentId) {
            // This is a reply — notify the parent comment owner
            const parentComment = await dbClient
                .select({ userId: commentsTable.userId })
                .from(commentsTable)
                .where(eq(commentsTable.id, String(parentCommentId)))
                .limit(1);
            const parentOwnerId = parentComment[0]?.userId;
            if (parentOwnerId && parentOwnerId !== userId) {
                const resolvedMsg = content ? await resolveMentionsInText(content.substring(0, 120)) : null;
                await createNotificationIfNotDuplicate({
                    recipientId: parentOwnerId,
                    senderId: userId,
                    type: "reply",
                    referenceId: String(postId),
                    message: resolvedMsg,
                });
            }
        } else {
            // This is a top-level comment — notify the post owner
            const postRecord = await dbClient
                .select({ userId: postsTable.userId })
                .from(postsTable)
                .where(eq(postsTable.id, String(postId)))
                .limit(1);
            const postOwnerId = postRecord[0]?.userId;
            if (postOwnerId && postOwnerId !== userId) {
                const resolvedMsg = content ? await resolveMentionsInText(content.substring(0, 120)) : null;
                await createNotificationIfNotDuplicate({
                    recipientId: postOwnerId,
                    senderId: userId,
                    type: "comment",
                    referenceId: String(postId),
                    message: resolvedMsg,
                });
            }
        }

        // Send mention notifications for @[userId] tags in comment text
        if (content?.trim()) {
            await sendMentionNotifications({
                text: content,
                senderId: userId,
                referenceId: String(postId),
                sourceType: "comment",
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error adding comment" });
    }
};

export const editComment = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        const { commentId } = req.params;
        const { content } = req.body;

        if (!userId) return res.status(401).json({ message: "Unauthorized" });
        if (!content?.trim()) return res.status(400).json({ message: "Content is required" });

        // Check ownership
        const existing = await dbClient.select().from(commentsTable).where(eq(commentsTable.id, commentId)).limit(1);
        if (!existing.length) return res.status(404).json({ message: "Comment not found" });
        if (existing[0].userId !== userId) return res.status(403).json({ message: "Forbidden" });

        await dbClient
            .update(commentsTable)
            .set({ content: content.trim() })
            .where(eq(commentsTable.id, commentId));

        // Send mention notifications for any @[userId] tags in the updated comment
        await sendMentionNotifications({
            text: content.trim(),
            senderId: userId,
            referenceId: String(existing[0].postId),
            sourceType: "comment",
        });

        res.json({ message: "Comment updated", content: content.trim() });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error editing comment" });
    }
};

export const deleteComment = async (req: Request, res: Response) => {
    try {
        const { commentId } = req.params;

        // Get the comment first to know the postId
        const commentToDelete = await dbClient
            .select()
            .from(commentsTable)
            .where(eq(commentsTable.id, commentId));

        if (commentToDelete.length === 0) {
            return res.status(404).json({ message: "Comment not found" });
        }

        const commentData = commentToDelete[0];
        const postId = commentData.postId;
        const isTopLevel = !commentData.parentCommentId;

        // Count how many comments will be deleted total (this comment + its replies, recursively)
        // For top-level: count itself + all direct replies (FK cascade deletes them)
        // For reply: just count itself
        let deleteCount = 1;
        if (isTopLevel) {
            const replyCount = await dbClient
                .select({ count: sql<number>`count(*)::int` })
                .from(commentsTable)
                .where(eq(commentsTable.parentCommentId, commentId));
            deleteCount += replyCount[0]?.count ?? 0;
        }

        // Delete associated media first
        await dbClient
            .delete(commentMediaTable)
            .where(eq(commentMediaTable.commentId, commentId));

        // Delete the comment (replies cascade via FK)
        await dbClient.delete(commentsTable).where(eq(commentsTable.id, commentId));

        // Decrement comment count by total deleted (comment + its replies)
        await dbClient
            .update(postsTable)
            .set({ commentCount: sql`GREATEST(${postsTable.commentCount} - ${deleteCount}, 0)` })
            .where(eq(postsTable.id, postId));

        res.json({ message: "Comment deleted" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error deleting comment" });
    }
};

export const getCommentsByPostId = async (req: Request, res: Response) => {
    try {
        const { postId } = req.params;
        const { cursor, limit: limitParam, parentId, sort } = req.query;
        const requestUserId = req.session?.activeUserId ?? null;

        // Pagination: default 20 top-level comments per page, max 50
        const limit = Math.min(parseInt(limitParam as string) || 20, 50);
        const cursorDate = cursor ? new Date(cursor as string) : null;

        // sort: "newest" (default) = newest first, "top" = most liked first
        const sortMode = sort === "top" ? "top" : "newest";

        // Build where conditions
        const whereConditions = parentId
            // Replies to a specific comment
            ? cursorDate
                ? and(eq(commentsTable.postId, postId), eq(commentsTable.parentCommentId, String(parentId)), lt(commentsTable.createdAt, cursorDate))
                : and(eq(commentsTable.postId, postId), eq(commentsTable.parentCommentId, String(parentId)))
            // Top-level comments only (no parent)
            : cursorDate
                ? and(eq(commentsTable.postId, postId), sql`${commentsTable.parentCommentId} IS NULL`, lt(commentsTable.createdAt, cursorDate))
                : and(eq(commentsTable.postId, postId), sql`${commentsTable.parentCommentId} IS NULL`);

        // For "top" sort on top-level comments, compute effective likes = own likes + sum of reply likes
        // For replies or "newest" sort, just use the standard fields/ordering
        const isTopLevelSort = sortMode === "top" && !parentId;

        let comments: Array<{
            id: string;
            content: string | null;
            likeCount: number;
            effectiveLikeCount?: number;
            createdAt: Date | null;
            updatedAt: Date | null;
            parentCommentId: string | null;
            user: {
                id: string;
                firstName: string;
                lastName: string;
                avatarUrl: string | null;
                username: string | null;
                role: string | null;
            };
        }>;

        if (isTopLevelSort) {
            // Use a raw SQL subquery to get effective like count (own + replies)
            // drizzle-orm doesn't support correlated subqueries in orderBy directly,
            // so we use sql`` template with table alias
            const effectiveLikeCountExpr = sql<number>`(
                ${commentsTable.likeCount} + COALESCE((
                    SELECT SUM(r.like_count)
                    FROM comments r
                    WHERE r.parent_comment_id = ${commentsTable.id}
                ), 0)
            )`;

            comments = await dbClient
                .select({
                    id: commentsTable.id,
                    content: commentsTable.content,
                    likeCount: commentsTable.likeCount,
                    effectiveLikeCount: effectiveLikeCountExpr,
                    createdAt: commentsTable.createdAt,
                    updatedAt: commentsTable.updatedAt,
                    parentCommentId: commentsTable.parentCommentId,
                    user: {
                        id: usersTable.id,
                        firstName: usersTable.firstName,
                        lastName: usersTable.lastName,
                        avatarUrl: usersTable.avatarUrl,
                        username: usersTable.username,
                        role: usersTable.role,
                    }
                })
                .from(commentsTable)
                .innerJoin(usersTable, eq(commentsTable.userId, usersTable.id))
                .where(whereConditions)
                .orderBy(desc(effectiveLikeCountExpr), desc(commentsTable.createdAt))
                .limit(limit + 1);
        } else {
            const orderBy = sortMode === "top"
                ? [desc(commentsTable.likeCount), desc(commentsTable.createdAt)]
                : [desc(commentsTable.createdAt)];

            comments = await dbClient
                .select({
                    id: commentsTable.id,
                    content: commentsTable.content,
                    likeCount: commentsTable.likeCount,
                    createdAt: commentsTable.createdAt,
                    updatedAt: commentsTable.updatedAt,
                    parentCommentId: commentsTable.parentCommentId,
                    user: {
                        id: usersTable.id,
                        firstName: usersTable.firstName,
                        lastName: usersTable.lastName,
                        avatarUrl: usersTable.avatarUrl,
                        username: usersTable.username,
                        role: usersTable.role,
                    }
                })
                .from(commentsTable)
                .innerJoin(usersTable, eq(commentsTable.userId, usersTable.id))
                .where(whereConditions)
                .orderBy(...orderBy)
                .limit(limit + 1);
        }

        const hasMore = comments.length > limit;
        const pageComments = hasMore ? comments.slice(0, limit) : comments;
        const nextCursor = hasMore ? pageComments[pageComments.length - 1].createdAt?.toISOString() : null;

        // Collect comment IDs for batch queries
        const commentIds = pageComments.map(c => c.id);

        // Batch fetch media for all comments at once
        const allMedia = commentIds.length > 0
            ? await dbClient
                .select()
                .from(commentMediaTable)
                .where(inArray(commentMediaTable.commentId, commentIds))
                .orderBy(commentMediaTable.order)
            : [];

        // Batch fetch reply counts for all comments
        const replyCounts = commentIds.length > 0
            ? await dbClient
                .select({
                    parentCommentId: commentsTable.parentCommentId,
                    count: sql<number>`count(*)::int`,
                })
                .from(commentsTable)
                .where(inArray(commentsTable.parentCommentId, commentIds))
                .groupBy(commentsTable.parentCommentId)
            : [];
        const replyCountMap = Object.fromEntries(replyCounts.map(r => [r.parentCommentId!, r.count]));

        // Batch fetch which comments the current user has liked
        const likedCommentIds = new Set<string>();
        if (requestUserId && commentIds.length > 0) {
            const myLikes = await dbClient
                .select({ commentId: commentLikesTable.commentId })
                .from(commentLikesTable)
                .where(and(
                    eq(commentLikesTable.userId, requestUserId),
                    inArray(commentLikesTable.commentId, commentIds),
                ));
            myLikes.forEach(l => likedCommentIds.add(l.commentId));
        }

        const commentsWithMeta = pageComments.map((comment) => ({
            ...comment,
            media: allMedia.filter(m => m.commentId === comment.id),
            replyCount: replyCountMap[comment.id] ?? 0,
            isLikedByMe: likedCommentIds.has(comment.id),
        }));

        res.json({ comments: commentsWithMeta, nextCursor, hasMore });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching comments" });
    }
};

// --- Saved Posts ---

export const getPostLikes = async (req: Request, res: Response) => {
    try {
        const { postId } = req.params;
        const likedUsers = await dbClient
            .select({
                id: usersTable.id,
                firstName: usersTable.firstName,
                lastName: usersTable.lastName,
                avatarUrl: usersTable.avatarUrl,
                username: usersTable.username
            })
            .from(likesTable)
            .innerJoin(usersTable, eq(likesTable.userId, usersTable.id))
            .where(eq(likesTable.postId, postId));

        res.json(likedUsers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching post likes" });
    }
};

export const repostPost = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        const { postId } = req.body;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Check if already reposted
        const existingRepost = await dbClient
            .select()
            .from(repostsTable)
            .where(
                and(
                    eq(repostsTable.userId, userId),
                    eq(repostsTable.postId, postId)
                )
            );

        if (existingRepost.length > 0) {
            // Un-repost
            await dbClient
                .delete(repostsTable)
                .where(
                    and(
                        eq(repostsTable.userId, userId),
                        eq(repostsTable.postId, postId)
                    )
                );

            // Decrement repost count in postsTable
            await dbClient
                .update(postsTable)
                .set({ repostCount: sql`${postsTable.repostCount} - 1` })
                .where(eq(postsTable.id, postId));

            // Get updated post to return new repost count
            const updatedPost = await dbClient
                .select({ repostCount: postsTable.repostCount })
                .from(postsTable)
                .where(eq(postsTable.id, postId))
                .limit(1);

            return res.status(200).json({
                message: "Post unreposted",
                repostCount: updatedPost[0]?.repostCount || 0
            });

        } else {
            // Repost
            await dbClient
                .insert(repostsTable)
                .values({ userId, postId });

            // Increment repost count in postsTable
            await dbClient
                .update(postsTable)
                .set({ repostCount: sql`${postsTable.repostCount} + 1` })
                .where(eq(postsTable.id, postId));

            // Get updated post to return new repost count
            const updatedPost = await dbClient
                .select({ repostCount: postsTable.repostCount })
                .from(postsTable)
                .where(eq(postsTable.id, postId))
                .limit(1);

            // Log Activity
            await import("../utils/activityLogger.js").then(({ logActivity }) => {
                logActivity(userId, "Reposted post", `Reposted post ID: ${postId}`, req);
            });

            // Create notification for post owner (don't notify yourself)
            const postRecord = await dbClient
                .select({ userId: postsTable.userId })
                .from(postsTable)
                .where(eq(postsTable.id, postId))
                .limit(1);
            const postOwnerId = postRecord[0]?.userId;
            if (postOwnerId && postOwnerId !== userId) {
                await createNotificationIfNotDuplicate({
                    recipientId: postOwnerId,
                    senderId: userId,
                    type: "repost",
                    referenceId: postId,
                    message: null,
                });
            }

            return res.status(200).json({
                message: "Post reposted",
                repostCount: updatedPost[0]?.repostCount || 0
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error reposting post" });
    }
};

export const getRepostedPosts = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Fetch posts that are linked to the user via repostsTable
        const repostedPosts = await dbClient
            .select({
                id: postsTable.id,
                userId: postsTable.userId,
                content: postsTable.content,
                mediaUrl: postsTable.mediaUrl,
                mediaType: postsTable.mediaType,
                category: postsTable.category,
                likeCount: postsTable.likeCount,
                commentCount: postsTable.commentCount,
                repostCount: postsTable.repostCount,
                shareCount: postsTable.shareCount,
                createdAt: postsTable.createdAt,
                repostedAt: repostsTable.createdAt, // Optional: tracking when it was reposted
                authorFirstName: usersTable.firstName,
                authorLastName: usersTable.lastName,
                authorAvatarUrl: usersTable.avatarUrl,
                authorRole: usersTable.role,
            })
            .from(repostsTable)
            .innerJoin(postsTable, eq(repostsTable.postId, postsTable.id))
            .leftJoin(usersTable, eq(postsTable.userId, usersTable.id))
            .where(eq(repostsTable.userId, userId))
            .orderBy(desc(repostsTable.createdAt));

        // Fetch media for each post and format author
        const postsWithMedia = await Promise.all(
            repostedPosts.map(async (post) => {
                const media = await dbClient
                    .select()
                    .from(postMediaTable)
                    .where(eq(postMediaTable.postId, post.id))
                    .orderBy(postMediaTable.order);

                const { authorFirstName, authorLastName, authorAvatarUrl, authorRole, ...postData } = post;
                return {
                    ...postData,
                    author: {
                        firstName: authorFirstName,
                        lastName: authorLastName,
                        avatarUrl: authorAvatarUrl,
                        role: authorRole,
                    },
                    media: media.length > 0 ? media : undefined,
                };
            })
        );

        res.json(postsWithMedia);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching reposted posts" });
    }
};

export const getRepostsByUserId = async (req: Request, res: Response) => {
    try {
        const currentUserId = req.session?.activeUserId;
        if (!currentUserId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { userId } = req.params;

        // Fetch posts that are linked to the user via repostsTable
        const repostedPosts = await dbClient
            .select({
                id: postsTable.id,
                userId: postsTable.userId,
                content: postsTable.content,
                mediaUrl: postsTable.mediaUrl,
                mediaType: postsTable.mediaType,
                category: postsTable.category,
                likeCount: postsTable.likeCount,
                commentCount: postsTable.commentCount,
                repostCount: postsTable.repostCount,
                shareCount: postsTable.shareCount,
                createdAt: postsTable.createdAt,
                repostedAt: repostsTable.createdAt, // Optional: tracking when it was reposted
                authorFirstName: usersTable.firstName,
                authorLastName: usersTable.lastName,
                authorAvatarUrl: usersTable.avatarUrl,
                authorRole: usersTable.role,
            })
            .from(repostsTable)
            .innerJoin(postsTable, eq(repostsTable.postId, postsTable.id))
            .leftJoin(usersTable, eq(postsTable.userId, usersTable.id))
            .where(eq(repostsTable.userId, userId))
            .orderBy(desc(repostsTable.createdAt));

        // Fetch media for each post and format author
        const postsWithMedia = await Promise.all(
            repostedPosts.map(async (post) => {
                const media = await dbClient
                    .select()
                    .from(postMediaTable)
                    .where(eq(postMediaTable.postId, post.id))
                    .orderBy(postMediaTable.order);

                const { authorFirstName, authorLastName, authorAvatarUrl, authorRole, ...postData } = post;
                return {
                    ...postData,
                    author: {
                        firstName: authorFirstName,
                        lastName: authorLastName,
                        avatarUrl: authorAvatarUrl,
                        role: authorRole,
                    },
                    media: media.length > 0 ? media : undefined,
                };
            })
        );

        res.json(postsWithMedia);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching user's reposted posts" });
    }
};

export const getLikedPosts = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Fetch posts that are linked to the user via likesTable
        const likedPosts = await dbClient
            .select({
                id: postsTable.id,
                userId: postsTable.userId,
                content: postsTable.content,
                mediaUrl: postsTable.mediaUrl,
                mediaType: postsTable.mediaType,
                category: postsTable.category,
                likeCount: postsTable.likeCount,
                commentCount: postsTable.commentCount,
                repostCount: postsTable.repostCount,
                shareCount: postsTable.shareCount,
                createdAt: postsTable.createdAt,
                likedAt: likesTable.createdAt,
                authorFirstName: usersTable.firstName,
                authorLastName: usersTable.lastName,
                authorAvatarUrl: usersTable.avatarUrl,
                authorRole: usersTable.role,
            })
            .from(likesTable)
            .innerJoin(postsTable, eq(likesTable.postId, postsTable.id))
            .leftJoin(usersTable, eq(postsTable.userId, usersTable.id))
            .where(eq(likesTable.userId, userId))
            .orderBy(desc(likesTable.createdAt));

        // Fetch media for each post and format author
        const postsWithMedia = await Promise.all(
            likedPosts.map(async (post) => {
                const media = await dbClient
                    .select()
                    .from(postMediaTable)
                    .where(eq(postMediaTable.postId, post.id))
                    .orderBy(postMediaTable.order);

                const { authorFirstName, authorLastName, authorAvatarUrl, authorRole, ...postData } = post;
                return {
                    ...postData,
                    author: {
                        firstName: authorFirstName,
                        lastName: authorLastName,
                        avatarUrl: authorAvatarUrl,
                        role: authorRole,
                    },
                    media: media.length > 0 ? media : undefined,
                };
            })
        );

        res.json(postsWithMedia);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching liked posts" });
    }
};

// --- Saved Posts ---

export const toggleSavePost = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { postId } = req.body;

        const existingSave = await dbClient
            .select()
            .from(savedPostsTable)
            .where(
                and(
                    eq(savedPostsTable.userId, userId),
                    eq(savedPostsTable.postId, postId)
                )
            );

        if (existingSave.length > 0) {
            // Unsave
            await dbClient
                .delete(savedPostsTable)
                .where(
                    and(
                        eq(savedPostsTable.userId, userId),
                        eq(savedPostsTable.postId, postId)
                    )
                );
            return res.status(200).json({ message: "Post unsaved" });
        } else {
            // Save
            const saved = await dbClient
                .insert(savedPostsTable)
                .values({ userId, postId })
                .returning();
            return res.status(201).json(saved[0]);
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error toggling save post" });
    }
};

export const getSavedPosts = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Fetch posts that are linked to the user via savedPostsTable
        const savedPosts = await dbClient
            .select({
                id: postsTable.id,
                userId: postsTable.userId,
                content: postsTable.content,
                mediaUrl: postsTable.mediaUrl,
                mediaType: postsTable.mediaType,
                category: postsTable.category,
                likeCount: postsTable.likeCount,
                commentCount: postsTable.commentCount,
                repostCount: postsTable.repostCount,
                shareCount: postsTable.shareCount,
                createdAt: postsTable.createdAt,
                savedAt: savedPostsTable.createdAt, // Optional: tracking when it was saved
                authorFirstName: usersTable.firstName,
                authorLastName: usersTable.lastName,
                authorAvatarUrl: usersTable.avatarUrl,
                authorRole: usersTable.role,
            })
            .from(savedPostsTable)
            .innerJoin(postsTable, eq(savedPostsTable.postId, postsTable.id))
            .leftJoin(usersTable, eq(postsTable.userId, usersTable.id))
            .where(eq(savedPostsTable.userId, userId))
            .orderBy(desc(savedPostsTable.createdAt));

        // Fetch media for each post and format author
        const postsWithMedia = await Promise.all(
            savedPosts.map(async (post) => {
                const media = await dbClient
                    .select()
                    .from(postMediaTable)
                    .where(eq(postMediaTable.postId, post.id))
                    .orderBy(postMediaTable.order);

                const { authorFirstName, authorLastName, authorAvatarUrl, authorRole, ...postData } = post;
                return {
                    ...postData,
                    author: {
                        firstName: authorFirstName,
                        lastName: authorLastName,
                        avatarUrl: authorAvatarUrl,
                        role: authorRole,
                    },
                    media: media.length > 0 ? media : undefined,
                };
            })
        );

        res.json(postsWithMedia);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching saved posts" });
    }
};

export const getPostByCommentId = async (req: Request, res: Response) => {
    try {
        const { commentId } = req.params;
        if (!commentId) {
            return res.status(400).json({ message: "commentId is required" });
        }

        // Find the comment to get its postId
        const comments = await dbClient
            .select({ postId: commentsTable.postId })
            .from(commentsTable)
            .where(eq(commentsTable.id, commentId))
            .limit(1);

        if (comments.length === 0) {
            return res.status(404).json({ message: "Comment not found" });
        }

        const postId = comments[0].postId;

        // Fetch the post
        const posts = await dbClient
            .select({
                id: postsTable.id,
                userId: postsTable.userId,
                content: postsTable.content,
                category: postsTable.category,
                likeCount: postsTable.likeCount,
                commentCount: postsTable.commentCount,
                repostCount: postsTable.repostCount,
                shareCount: postsTable.shareCount,
                createdAt: postsTable.createdAt,
                authorFirstName: usersTable.firstName,
                authorLastName: usersTable.lastName,
                authorAvatarUrl: usersTable.avatarUrl,
            })
            .from(postsTable)
            .leftJoin(usersTable, eq(postsTable.userId, usersTable.id))
            .where(eq(postsTable.id, postId))
            .limit(1);

        if (posts.length === 0) {
            return res.status(404).json({ message: "Post not found" });
        }

        const post = posts[0];
        return res.json({
            postId: post.id,
            id: post.id,
            content: post.content,
            author: {
                firstName: post.authorFirstName,
                lastName: post.authorLastName,
                avatarUrl: post.authorAvatarUrl,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching post from comment" });
    }
};

export const getPostById = async (req: Request, res: Response) => {
    try {
        const { postId } = req.params;
        if (!postId) {
            return res.status(400).json({ message: "postId is required" });
        }

        const posts = await dbClient
            .select({
                id: postsTable.id,
                userId: postsTable.userId,
                content: postsTable.content,
                category: postsTable.category,
                likeCount: postsTable.likeCount,
                commentCount: postsTable.commentCount,
                repostCount: postsTable.repostCount,
                shareCount: postsTable.shareCount,
                status: postsTable.status,
                createdAt: postsTable.createdAt,
                updatedAt: postsTable.updatedAt,
                authorFirstName: usersTable.firstName,
                authorLastName: usersTable.lastName,
                authorAvatarUrl: usersTable.avatarUrl,
                authorRole: usersTable.role,
            })
            .from(postsTable)
            .leftJoin(usersTable, eq(postsTable.userId, usersTable.id))
            .where(eq(postsTable.id, postId))
            .limit(1);

        if (posts.length === 0) {
            // คืน 200 + { deleted: true } แทน 404 เพื่อให้ frontend จัดการได้โดยไม่มี browser error log
            return res.status(200).json({ deleted: true });
        }

        const post = posts[0];

        const media = await dbClient
            .select()
            .from(postMediaTable)
            .where(eq(postMediaTable.postId, post.id));

        return res.json({
            id: post.id,
            userId: post.userId,
            content: post.content,
            category: post.category,
            likeCount: post.likeCount,
            commentCount: post.commentCount,
            repostCount: post.repostCount,
            shareCount: post.shareCount,
            status: post.status,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
            author: {
                firstName: post.authorFirstName,
                lastName: post.authorLastName,
                avatarUrl: post.authorAvatarUrl,
                role: post.authorRole,
            },
            media: media.sort((a, b) => a.order - b.order),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching post" });
    }
};

export const getUserPosts = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Fetch user's posts with author info
        const posts = await dbClient
            .select({
                id: postsTable.id,
                userId: postsTable.userId,
                content: postsTable.content,
                category: postsTable.category,
                likeCount: postsTable.likeCount,
                commentCount: postsTable.commentCount,
                repostCount: postsTable.repostCount,
                shareCount: postsTable.shareCount,
                createdAt: postsTable.createdAt,
                updatedAt: postsTable.updatedAt,
                authorFirstName: usersTable.firstName,
                authorLastName: usersTable.lastName,
                authorAvatarUrl: usersTable.avatarUrl,
                authorRole: usersTable.role,
            })
            .from(postsTable)
            .leftJoin(usersTable, eq(postsTable.userId, usersTable.id))
            .where(eq(postsTable.userId, userId))
            .orderBy(desc(postsTable.createdAt));

        // Fetch media for all posts
        const postIds = posts.map(p => p.id);
        const mediaMap: Record<string, any[]> = {};

        if (postIds.length > 0) {
            const mediaRecords = await dbClient
                .select()
                .from(postMediaTable)
                .where(sql`${postMediaTable.postId} IN (${sql.join(postIds.map(id => sql`${id}`), sql`, `)})`);

            mediaRecords.reduce((acc, media) => {
                const postId = String(media.postId);
                if (!acc[postId]) acc[postId] = [];
                acc[postId].push(media);
                return acc;
            }, mediaMap);
        }

        // Format the response
        const formattedPosts = posts.map(post => ({
            id: post.id,
            userId: post.userId,
            content: post.content,
            category: post.category,
            likeCount: post.likeCount,
            commentCount: post.commentCount,
            repostCount: post.repostCount,
            shareCount: post.shareCount,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
            author: {
                firstName: post.authorFirstName,
                lastName: post.authorLastName,
                avatarUrl: post.authorAvatarUrl,
                role: post.authorRole,
            },
            media: (mediaMap[String(post.id)] || []).sort((a: any, b: any) => a.order - b.order),
        }));

        res.json(formattedPosts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching user posts" });
    }
};

// Get posts by user ID (for viewing other users' profiles)
export const getPostsByUserId = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const viewerId = req.session?.activeUserId; // may be undefined for unauthenticated

        // Check if the viewer is a friend of the profile owner
        let viewerIsFriend = false;
        if (viewerId && viewerId !== userId) {
            const friendship = await dbClient
                .select({ id: friendshipsTable.id })
                .from(friendshipsTable)
                .where(
                    and(
                        eq(friendshipsTable.status, 'accepted'),
                        sql`(
                            (${friendshipsTable.userId1} = ${viewerId} AND ${friendshipsTable.userId2} = ${userId}) OR
                            (${friendshipsTable.userId1} = ${userId}  AND ${friendshipsTable.userId2} = ${viewerId})
                        )`
                    )
                )
                .limit(1);
            viewerIsFriend = friendship.length > 0;
        } else if (viewerId === userId) {
            // Viewing own profile — can see everything
            viewerIsFriend = true;
        }

        // Build visibility filter:
        // - If viewer is a friend (or self): show all posts
        // - Otherwise: hide posts with category = 'Friends'
        const visibilityFilter = viewerIsFriend
            ? and(eq(postsTable.userId, userId), ne(postsTable.status, 'banned'))
            : and(eq(postsTable.userId, userId), ne(postsTable.status, 'banned'), sql`${postsTable.category} != 'Friends'`);

        // Fetch user's posts with author info
        const posts = await dbClient
            .select({
                id: postsTable.id,
                userId: postsTable.userId,
                content: postsTable.content,
                category: postsTable.category,
                likeCount: postsTable.likeCount,
                commentCount: postsTable.commentCount,
                repostCount: postsTable.repostCount,
                shareCount: postsTable.shareCount,
                createdAt: postsTable.createdAt,
                updatedAt: postsTable.updatedAt,
                authorFirstName: usersTable.firstName,
                authorLastName: usersTable.lastName,
                authorAvatarUrl: usersTable.avatarUrl,
                authorRole: usersTable.role,
            })
            .from(postsTable)
            .leftJoin(usersTable, eq(postsTable.userId, usersTable.id))
            .where(visibilityFilter)
            .orderBy(desc(postsTable.createdAt));

        // Fetch media for all posts
        const postIds = posts.map(p => p.id);
        const mediaMap: Record<string, any[]> = {};

        if (postIds.length > 0) {
            const mediaRecords = await dbClient
                .select()
                .from(postMediaTable)
                .where(sql`${postMediaTable.postId} IN (${sql.join(postIds.map(id => sql`${id}`), sql`, `)})`);

            mediaRecords.reduce((acc, media) => {
                const postId = String(media.postId);
                if (!acc[postId]) acc[postId] = [];
                acc[postId].push(media);
                return acc;
            }, mediaMap);
        }

        // Format the response
        const formattedPosts = posts.map(post => ({
            id: post.id,
            userId: post.userId,
            content: post.content,
            category: post.category,
            likeCount: post.likeCount,
            commentCount: post.commentCount,
            repostCount: post.repostCount,
            shareCount: post.shareCount,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
            author: {
                firstName: post.authorFirstName,
                lastName: post.authorLastName,
                avatarUrl: post.authorAvatarUrl,
                role: post.authorRole,
            },
            media: (mediaMap[String(post.id)] || []).sort((a: any, b: any) => a.order - b.order),
        }));

        res.json(formattedPosts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching user posts" });
    }
};

// Get event data for a post (for preview before accepting)
export const getEventFromPost = async (req: Request, res: Response) => {
    try {
        const { postId } = req.params;

        const eventPost = await dbClient
            .select()
            .from(eventPostsTable)
            .where(eq(eventPostsTable.postId, postId))
            .limit(1);

        if (eventPost.length === 0) {
            return res.status(404).json({ message: "Event not found for this post" });
        }

        const event = eventPost[0];
        return res.status(200).json({
            eventTitle: event.eventTitle,
            eventDescription: event.eventDescription,
            eventStartTime: event.eventStartTime,
            eventEndTime: event.eventEndTime,
            eventType: event.eventType,
        });
    } catch (error: any) {
        console.error("getEventFromPost Error:", error);
        res.status(500).json({ message: "Error fetching event", error: error.message });
    }
};

// Accept event from post and add to user's calendar
export const acceptEventFromPost = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { postId } = req.params;

        // 1. Fetch event data from event_posts table
        const eventPost = await dbClient
            .select()
            .from(eventPostsTable)
            .where(eq(eventPostsTable.postId, postId))
            .limit(1);

        if (eventPost.length === 0) {
            return res.status(404).json({ message: "Event not found for this post" });
        }

        const event = eventPost[0];

        // 2. Check if user already accepted this event (prevent duplicates)
        const existingEvent = await dbClient
            .select()
            .from(calendarEventsTable)
            .where(
                and(
                    eq(calendarEventsTable.userId, userId),
                    eq(calendarEventsTable.title, event.eventTitle),
                    eq(calendarEventsTable.startTime, event.eventStartTime)
                )
            )
            .limit(1);

        if (existingEvent.length > 0) {
            return res.status(200).json({
                message: "Event already accepted",
                event: existingEvent[0],
            });
        }

        // 3. Create calendar event for the user
        const [newCalendarEvent] = await dbClient
            .insert(calendarEventsTable)
            .values({
                userId,
                title: event.eventTitle,
                description: event.eventDescription,
                startTime: event.eventStartTime,
                endTime: event.eventEndTime,
                type: "post_event",
                status: "pending",
            })
            .returning();

        res.status(201).json({
            message: "Event accepted successfully",
            event: newCalendarEvent,
        });
    } catch (error: any) {
        console.error("acceptEventFromPost Error:", error);
        res.status(500).json({
            message: "Error accepting event",
            error: error.message,
        });
    }
};

// Get liked posts by user ID
export const getLikedPostsByUserId = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        // Fetch posts that are linked to the user via likesTable
        const likedPosts = await dbClient
            .select({
                id: postsTable.id,
                userId: postsTable.userId,
                content: postsTable.content,
                mediaUrl: postsTable.mediaUrl,
                mediaType: postsTable.mediaType,
                category: postsTable.category,
                likeCount: postsTable.likeCount,
                commentCount: postsTable.commentCount,
                repostCount: postsTable.repostCount,
                shareCount: postsTable.shareCount,
                createdAt: postsTable.createdAt,
                likedAt: likesTable.createdAt,
                authorFirstName: usersTable.firstName,
                authorLastName: usersTable.lastName,
                authorAvatarUrl: usersTable.avatarUrl,
                authorRole: usersTable.role,
            })
            .from(likesTable)
            .innerJoin(postsTable, eq(likesTable.postId, postsTable.id))
            .leftJoin(usersTable, eq(postsTable.userId, usersTable.id))
            .where(eq(likesTable.userId, userId))
            .orderBy(desc(likesTable.createdAt));

        // Fetch media for each post and format author
        const postsWithMedia = await Promise.all(
            likedPosts.map(async (post) => {
                const media = await dbClient
                    .select()
                    .from(postMediaTable)
                    .where(eq(postMediaTable.postId, post.id))
                    .orderBy(postMediaTable.order);

                const { authorFirstName, authorLastName, authorAvatarUrl, authorRole, ...postData } = post;
                return {
                    ...postData,
                    author: {
                        firstName: authorFirstName,
                        lastName: authorLastName,
                        avatarUrl: authorAvatarUrl,
                        role: authorRole,
                    },
                    media: media.length > 0 ? media : undefined,
                };
            })
        );

        res.json(postsWithMedia);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching user liked posts" });
    }
};

// --- Comment Likes ---

export const likeComment = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        const { commentId } = req.body;

        if (!userId) return res.status(401).json({ message: "Unauthorized" });
        if (!commentId) return res.status(400).json({ message: "commentId is required" });

        const existing = await dbClient
            .select()
            .from(commentLikesTable)
            .where(and(eq(commentLikesTable.userId, userId), eq(commentLikesTable.commentId, String(commentId))))
            .limit(1);

        if (existing.length > 0) {
            // Unlike
            await dbClient
                .delete(commentLikesTable)
                .where(and(eq(commentLikesTable.userId, userId), eq(commentLikesTable.commentId, String(commentId))));

            await dbClient
                .update(commentsTable)
                .set({ likeCount: sql`GREATEST(${commentsTable.likeCount} - 1, 0)` })
                .where(eq(commentsTable.id, String(commentId)));

            const updated = await dbClient.select({ likeCount: commentsTable.likeCount }).from(commentsTable).where(eq(commentsTable.id, String(commentId))).limit(1);
            return res.json({ message: "Unliked", liked: false, likeCount: updated[0]?.likeCount ?? 0 });
        } else {
            // Like
            await dbClient
                .insert(commentLikesTable)
                .values({ userId, commentId: String(commentId) });

            await dbClient
                .update(commentsTable)
                .set({ likeCount: sql`${commentsTable.likeCount} + 1` })
                .where(eq(commentsTable.id, String(commentId)));

            const updated = await dbClient.select({ likeCount: commentsTable.likeCount, userId: commentsTable.userId, content: commentsTable.content }).from(commentsTable).where(eq(commentsTable.id, String(commentId))).limit(1);

            // Notify comment owner (don't notify yourself)
            const commentOwnerId = updated[0]?.userId;
            if (commentOwnerId && commentOwnerId !== userId) {
                await createNotificationIfNotDuplicate({
                    recipientId: commentOwnerId,
                    senderId: userId,
                    type: "comment_like",
                    referenceId: String(commentId),
                    message: updated[0]?.content ? updated[0].content.substring(0, 100) : null,
                });
            }

            return res.json({ message: "Liked", liked: true, likeCount: updated[0]?.likeCount ?? 0 });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error toggling comment like" });
    }
};
