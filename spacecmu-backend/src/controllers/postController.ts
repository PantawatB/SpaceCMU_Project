import type { Request, Response } from "express";
import { dbClient } from "../../db/client.js";
import { postsTable, commentsTable, likesTable, savedPostsTable, usersTable, repostsTable } from "../../db/schema.js";
import { eq, desc, and, sql } from "drizzle-orm";
import { getUserIdFromRequest } from "../utils/authUtils.js";

// --- Post Management ---

export const getAllPosts = async (req: Request, res: Response) => {
    try {
        const posts = await dbClient.select().from(postsTable).orderBy(desc(postsTable.createdAt));
        res.json(posts);
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
