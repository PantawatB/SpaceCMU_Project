import type { Request, Response } from "express";
import { dbClient } from "../../db/client.js";
import { friendshipsTable, usersTable } from "../../db/schema.js";
import { eq, or, and } from "drizzle-orm";

export const sendFriendRequest = async (req: Request, res: Response) => {
    try {
        const { userId1, userId2 } = req.body;
        const request = await dbClient
            .insert(friendshipsTable)
            .values({ userId1, userId2, status: "pending" })
            .returning();
        res.status(201).json(request[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error sending friend request" });
    }
};

export const respondToRequest = async (req: Request, res: Response) => {
    try {
        const { requestId, status } = req.body; // status: 'accepted', 'blocked', or 'pending'

        if (!requestId || !status) {
            res.status(400).json({ message: "requestId and status are required" });
            return;
        }

        const updated = await dbClient
            .update(friendshipsTable)
            .set({ status })
            .where(eq(friendshipsTable.id, requestId))
            .returning();

        if (updated.length === 0) {
            res.status(404).json({ message: "Friend request not found with provided ID" });
            return;
        }

        res.json({ message: `Friend request ${status}`, friendship: updated[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error responding to friend request" });
    }
};


export const getFriendsList = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const friends = await dbClient
            .select()
            .from(friendshipsTable)
            .where(
                and(
                    or(eq(friendshipsTable.userId1, userId), eq(friendshipsTable.userId2, userId)),
                    eq(friendshipsTable.status, "accepted")
                )
            );
        res.json(friends);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching friends list" });
    }
};
