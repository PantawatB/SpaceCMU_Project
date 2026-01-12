import type { Request, Response } from "express";
import { dbClient } from "../../db/client.js";
import { postsTable, commentsTable, likesTable, savedPostsTable, usersTable, repostsTable, postMediaTable, friendshipsTable } from "../../db/schema.js";
import { eq, desc, and, sql, lt } from "drizzle-orm";
import { getUserIdFromRequest } from "../utils/authUtils.js";

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
                status: postsTable.status,
                createdAt: postsTable.createdAt,
                updatedAt: postsTable.updatedAt,
                // Author info
                authorFirstName: usersTable.firstName,
                authorLastName: usersTable.lastName,
                authorAvatarUrl: usersTable.avatarUrl,
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

                // Filter posts by friends AND category = 'Friends'
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
                        status: postsTable.status,
                        createdAt: postsTable.createdAt,
                        updatedAt: postsTable.updatedAt,
                        authorFirstName: usersTable.firstName,
                        authorLastName: usersTable.lastName,
                        authorAvatarUrl: usersTable.avatarUrl,
                    })
                    .from(postsTable)
                    .leftJoin(usersTable, eq(postsTable.userId, usersTable.id))
                    .where(
                        and(
                            sql`${postsTable.userId} IN (${sql.join(friendIds.map(id => sql`${id}`), sql`, `)})`,
                            eq(postsTable.category, 'Friends')
                        )
                    )
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

                        const { authorFirstName, authorLastName, authorAvatarUrl, ...postData } = post;
                        return {
                            ...postData,
                            author: {
                                firstName: authorFirstName,
                                lastName: authorLastName,
                                avatarUrl: authorAvatarUrl,
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
                        status: postsTable.status,
                        createdAt: postsTable.createdAt,
                        updatedAt: postsTable.updatedAt,
                        authorFirstName: usersTable.firstName,
                        authorLastName: usersTable.lastName,
                        authorAvatarUrl: usersTable.avatarUrl,
                    })
                    .from(postsTable)
                    .leftJoin(usersTable, eq(postsTable.userId, usersTable.id))
                    .where(eq(postsTable.category, category as string))
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

                        const { authorFirstName, authorLastName, authorAvatarUrl, ...postData } = post;
                        return {
                            ...postData,
                            author: {
                                firstName: authorFirstName,
                                lastName: authorLastName,
                                avatarUrl: authorAvatarUrl,
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
                status: postsTable.status,
                createdAt: postsTable.createdAt,
                updatedAt: postsTable.updatedAt,
                authorFirstName: usersTable.firstName,
                authorLastName: usersTable.lastName,
                authorAvatarUrl: usersTable.avatarUrl,
            })
            .from(postsTable)
            .leftJoin(usersTable, eq(postsTable.userId, usersTable.id))
            .where(whereConditions)
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

                const { authorFirstName, authorLastName, authorAvatarUrl, ...postData } = post;
                return {
                    ...postData,
                    author: {
                        firstName: authorFirstName,
                        lastName: authorLastName,
                        avatarUrl: authorAvatarUrl,
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

        const { content, category } = req.body;
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

        // 3. Fetch complete post with media
        const media = await dbClient
            .select()
            .from(postMediaTable)
            .where(eq(postMediaTable.postId, newPost.id))
            .orderBy(postMediaTable.order);

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
    } catch (error) {
        console.error("deletePost Error:", error);
        res.status(500).json({ message: "Error deleting post" });
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

            return res.status(200).json({ message: "Unliked" });
        } else {
            // Like
            const newLike = await dbClient
                .insert(likesTable)
                .values({ userId, postId })
                .returning();

            // Increment like count in postsTable
            await dbClient
                .update(postsTable)
                .set({ likeCount: sql`${postsTable.likeCount} + 1` })
                .where(eq(postsTable.id, postId));

            return res.status(201).json(newLike[0]);
        }

    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: "Error toggling like" });
    }
};

export const addComment = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        const { postId, content } = req.body;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const newComment = await dbClient
            .insert(commentsTable)
            .values({ userId, postId, content })
            .returning();

        // Increment comment count in postsTable
        await dbClient
            .update(postsTable)
            .set({ commentCount: sql`${postsTable.commentCount} + 1` })
            .where(eq(postsTable.id, postId));

        res.status(201).json(newComment[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error adding comment" });
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

        const postId = commentToDelete[0].postId;

        // Delete the comment
        await dbClient.delete(commentsTable).where(eq(commentsTable.id, commentId));

        // Decrement comment count
        await dbClient
            .update(postsTable)
            .set({ commentCount: sql`${postsTable.commentCount} - 1` })
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
        const comments = await dbClient
            .select({
                id: commentsTable.id,
                content: commentsTable.content,
                createdAt: commentsTable.createdAt,
                user: {
                    id: usersTable.id,
                    firstName: usersTable.firstName,
                    lastName: usersTable.lastName,
                    avatarUrl: usersTable.avatarUrl,
                    username: usersTable.username
                }
            })
            .from(commentsTable)
            .innerJoin(usersTable, eq(commentsTable.userId, usersTable.id))
            .where(eq(commentsTable.postId, postId))
            .orderBy(desc(commentsTable.createdAt));

        res.json(comments);
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

        // Insert record into repostsTable
        await dbClient
            .insert(repostsTable)
            .values({ userId, postId });

        // Increment repost count in postsTable
        await dbClient
            .update(postsTable)
            .set({ repostCount: sql`${postsTable.repostCount} + 1` })
            .where(eq(postsTable.id, postId));

        res.status(200).json({ message: "Post reposted" });
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
                createdAt: postsTable.createdAt,
                repostedAt: repostsTable.createdAt // Optional: tracking when it was reposted
            })
            .from(repostsTable)
            .innerJoin(postsTable, eq(repostsTable.postId, postsTable.id))
            .where(eq(repostsTable.userId, userId))
            .orderBy(desc(repostsTable.createdAt));

        res.json(repostedPosts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching reposted posts" });
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
                createdAt: postsTable.createdAt,
                likedAt: likesTable.createdAt
            })
            .from(likesTable)
            .innerJoin(postsTable, eq(likesTable.postId, postsTable.id))
            .where(eq(likesTable.userId, userId))
            .orderBy(desc(likesTable.createdAt));

        res.json(likedPosts);
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
        const saved = await dbClient
            .select()
            .from(savedPostsTable)
            .where(eq(savedPostsTable.userId, userId));
        res.json(saved);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching saved posts" });
    }
};

export const getUserPosts = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const posts = await dbClient
            .select()
            .from(postsTable)
            .where(eq(postsTable.userId, userId))
            .orderBy(desc(postsTable.createdAt));
        res.json(posts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching user posts" });
    }
};
