import type { Request, Response } from "express";
import { dbClient } from "../../db/client.js";
import { postsTable, commentsTable, likesTable, savedPostsTable } from "../../db/schema.js";
import { eq, desc } from "drizzle-orm";

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
        const newLike = await dbClient
            .insert(likesTable)
            .values({ userId, postId })
            .returning();
        res.status(201).json(newLike[0]);
    } catch (error: any) {
        if (error.code === "23505") {
            res.status(400).json({ message: "Post already liked" });
        } else {
            console.error(error);
            res.status(500).json({ message: "Error liking post" });
        }
    }
};

export const addComment = async (req: Request, res: Response) => {
    try {
        const { userId, postId, content } = req.body;
        const newComment = await dbClient
            .insert(commentsTable)
            .values({ userId, postId, content })
            .returning();
        res.status(201).json(newComment[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error adding comment" });
    }
};

// --- Saved Posts ---

export const savePost = async (req: Request, res: Response) => {
    try {
        const { userId, postId } = req.body;
        const saved = await dbClient
            .insert(savedPostsTable)
            .values({ userId, postId })
            .returning();
        res.status(201).json(saved[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error saving post" });
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
