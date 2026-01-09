import type { Request, Response } from "express";
import { dbClient } from "../../db/client.js";
import { friendshipsTable, usersTable } from "../../db/schema.js";
import { eq, or, and, sql } from "drizzle-orm";

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


        if (status === "rejected") {
            const deleted = await dbClient
                .delete(friendshipsTable)
                .where(eq(friendshipsTable.id, requestId))
                .returning();

            if (deleted.length === 0) {
                res.status(404).json({ message: "Friend request not found with provided ID" });
                return;
            }

            res.json({ message: "Friend request rejected" });
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

        // If accepted, increment friendsCount for both users
        if (status === "accepted") {
            const friendship = updated[0];
            const { userId1, userId2 } = friendship;

            // Increment for sender
            await dbClient
                .update(usersTable)
                .set({ friendsCount: sql`COALESCE(${usersTable.friendsCount}, 0) + 1` })
                .where(eq(usersTable.id, userId1));

            // Increment for receiver
            await dbClient
                .update(usersTable)
                .set({ friendsCount: sql`COALESCE(${usersTable.friendsCount}, 0) + 1` })
                .where(eq(usersTable.id, userId2));
        }

        res.json({ message: `Friend request ${status}`, friendship: updated[0] });
    } catch (error) {
        console.error("Error in respondToRequest:", error);
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

export const getPendingRequests = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        // Find requests where current user is the RECEIVER (userId2) and status is pending
        const requests = await dbClient
            .select({
                requestId: friendshipsTable.id,
                senderId: usersTable.id,
                firstName: usersTable.firstName,
                lastName: usersTable.lastName,
                username: usersTable.username,
                avatarUrl: usersTable.avatarUrl,
                createdAt: friendshipsTable.createdAt
            })
            .from(friendshipsTable)
            .innerJoin(usersTable, eq(friendshipsTable.userId1, usersTable.id)) // Join with SENDER info
            .where(
                and(
                    eq(friendshipsTable.userId2, userId),
                    eq(friendshipsTable.status, "pending")
                )
            );

        res.json(requests);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching pending requests" });
    }
};
export const deleteFriend = async (req: Request, res: Response) => {
    try {
        const { userId, friendId } = req.params;

        // Find friendship in either direction
        const friendship = await dbClient
            .delete(friendshipsTable)
            .where(
                or(
                    and(eq(friendshipsTable.userId1, userId), eq(friendshipsTable.userId2, friendId)),
                    and(eq(friendshipsTable.userId1, friendId), eq(friendshipsTable.userId2, userId))
                )
            )
            .returning();

        if (friendship.length === 0) {
            res.status(404).json({ message: "Friendship not found" });
            return;
        }

        // Decrement friendsCount for both users
        // Use GREATEST to ensure we don't go below 0
        await dbClient.update(usersTable)
            .set({ friendsCount: sql`GREATEST(COALESCE(${usersTable.friendsCount}, 0) - 1, 0)` })
            .where(eq(usersTable.id, userId));

        await dbClient.update(usersTable)
            .set({ friendsCount: sql`GREATEST(COALESCE(${usersTable.friendsCount}, 0) - 1, 0)` })
            .where(eq(usersTable.id, friendId));

        res.json({ message: "Friend deleted successfully", friendship: friendship[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error deleting friend" });
    }
};
