import type { Request, Response } from "express";
import { dbClient } from "../../db/client.js";
import { followsTable, usersTable } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";

// Follow a user
export const followUser = async (req: Request, res: Response) => {
    try {
        const followerId = req.session?.activeUserId;
        const { followingId } = req.body;

        if (!followerId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (followerId === followingId) {
            return res.status(400).json({ message: "You cannot follow yourself" });
        }

        const newFollow = await dbClient
            .insert(followsTable)
            .values({
                followerId,
                followingId,
            })
            .returning();

        res.status(201).json({ message: "Followed successfully", follow: newFollow[0] });
    } catch (error: any) {
        if (error.code === '23505') {
            return res.status(400).json({ message: "You are already following this user" });
        }
        console.error("Error in followUser:", error);
        res.status(500).json({ message: "Error following user" });
    }
};

// Unfollow a user
export const unfollowUser = async (req: Request, res: Response) => {
    try {
        const followerId = req.session?.activeUserId;
        const { followingId } = req.params;

        if (!followerId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const deleted = await dbClient
            .delete(followsTable)
            .where(
                and(
                    eq(followsTable.followerId, followerId),
                    eq(followsTable.followingId, followingId)
                )
            )
            .returning();

        if (deleted.length === 0) {
            return res.status(404).json({ message: "You are not following this user" });
        }

        res.json({ message: "Unfollowed successfully" });
    } catch (error) {
        console.error("Error in unfollowUser:", error);
        res.status(500).json({ message: "Error unfollowing user" });
    }
};

// Check follow status
export const getFollowStatus = async (req: Request, res: Response) => {
    try {
        const followerId = req.session?.activeUserId;
        const { followingId } = req.params;

        if (!followerId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const follow = await dbClient
            .select()
            .from(followsTable)
            .where(
                and(
                    eq(followsTable.followerId, followerId),
                    eq(followsTable.followingId, followingId)
                )
            )
            .limit(1);

        res.json({ isFollowing: follow.length > 0 });
    } catch (error) {
        console.error("Error in getFollowStatus:", error);
        res.status(500).json({ message: "Error fetching follow status" });
    }
};
