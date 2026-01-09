import type { Request, Response } from "express";
import { dbClient } from "../../db/client.js";
import { postsTable, commentsTable, likesTable, savedPostsTable, usersTable, sharesTable } from "../../db/schema.js";
import { eq, desc, and, sql } from "drizzle-orm";

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
        const { userId, content, imageUrl, category } = req.body;
        const newPost = await dbClient
            .insert(postsTable)
            .values({
                userId,
                content,
                imageUrl,
                category: category || "Global",
            })
            .returning();
        res.status(201).json(newPost[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error creating post" });
    }
};

// --- Interactions ---

export const likePost = async (req: Request, res: Response) => {
    try {
        const { userId, postId } = req.body;

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
        const { userId, postId, content } = req.body;
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

export const sharePost = async (req: Request, res: Response) => {
    try {
        const { userId, postId } = req.body;

        if (!userId) {
            return res.status(400).json({ message: "userId is required to track sharing" });
        }

        // Insert record into sharesTable
        await dbClient
            .insert(sharesTable)
            .values({ userId, postId });

        // Increment share count in postsTable
        await dbClient
            .update(postsTable)
            .set({ shareCount: sql`${postsTable.shareCount} + 1` })
            .where(eq(postsTable.id, postId));

        res.status(200).json({ message: "Post shared" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error sharing post" });
    }
};

export const getSharedPosts = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        // Fetch posts that are linked to the user via sharesTable
        const sharedPosts = await dbClient
            .select({
                id: postsTable.id,
                userId: postsTable.userId,
                content: postsTable.content,
                mediaUrl: postsTable.mediaUrl,
                mediaType: postsTable.mediaType,
                category: postsTable.category,
                likeCount: postsTable.likeCount,
                commentCount: postsTable.commentCount,
                shareCount: postsTable.shareCount,
                createdAt: postsTable.createdAt,
                sharedAt: sharesTable.createdAt // Optional: tracking when it was shared
            })
            .from(sharesTable)
            .innerJoin(postsTable, eq(sharesTable.postId, postsTable.id))
            .where(eq(sharesTable.userId, userId))
            .orderBy(desc(sharesTable.createdAt));

        res.json(sharedPosts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching shared posts" });
    }
};

// --- Saved Posts ---

export const toggleSavePost = async (req: Request, res: Response) => {
    try {
        const { userId, postId } = req.body;

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
        const { userId } = req.params;
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
        const { userId } = req.params;
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
