import type { Request, Response } from "express";
import { dbClient } from "../../db/client.js";
import { friendshipsTable, usersTable } from "../../db/schema.js";
import { eq, or, and, sql } from "drizzle-orm";
import { getUserIdFromRequest } from "../utils/authUtils.js";

export const sendFriendRequest = async (req: Request, res: Response) => {
    try {
        const userId1 = req.session?.activeUserId;
        if (!userId1) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { userId2 } = req.body;
        const request = await dbClient
            .insert(friendshipsTable)
            .values({ userId1, userId2, status: "pending" })
            .returning();
        res.status(201).json(request[0]);

        // Log Activity
        await import("../utils/activityLogger.js").then(({ logActivity }) => {
            logActivity(userId1, "Sent friend request", `Sent request to user ${userId2}`, req);
        });
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

        if (status === "accepted") {
            // Log Activity for receiver (person who accepted)
            const userId = req.session?.activeUserId;
            if (userId) {
                await import("../utils/activityLogger.js").then(({ logActivity }) => {
                    logActivity(userId, "Accepted friend request", `Accepted friend request ID: ${requestId}`, req);
                });
            }
        }
    } catch (error) {
        console.error("Error in respondToRequest:", error);
        res.status(500).json({ message: "Error responding to friend request" });
    }
};


export const getFriendsList = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
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
        const userId = req.session?.activeUserId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

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
        const userId = req.session?.activeUserId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { friendId } = req.params;

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

        // Log Activity
        await import("../utils/activityLogger.js").then(({ logActivity }) => {
            logActivity(userId, "Removed friend", `Removed friend ${friendId}`, req);
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error deleting friend" });
    }
};

// Get friends with their last active status (Top 3 most recent)
export const getActiveFriends = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Get all accepted friendships
        const friendships = await dbClient
            .select()
            .from(friendshipsTable)
            .where(
                and(
                    or(eq(friendshipsTable.userId1, userId), eq(friendshipsTable.userId2, userId)),
                    eq(friendshipsTable.status, "accepted")
                )
            );

        // Get friend IDs
        const friendIds = friendships.map(f =>
            f.userId1 === userId ? f.userId2 : f.userId1
        );

        if (friendIds.length === 0) {
            return res.json([]);
        }

        // Fetch friend details with lastActiveAt, sorted by most recent activity
        const friends = await dbClient
            .select({
                id: usersTable.id,
                firstName: usersTable.firstName,
                lastName: usersTable.lastName,
                username: usersTable.username,
                avatarUrl: usersTable.avatarUrl,
                lastActiveAt: usersTable.lastActiveAt,
            })
            .from(usersTable)
            .where(sql`${usersTable.id} IN (${sql.join(friendIds.map(id => sql`${id}`), sql`, `)})`)
            .orderBy(sql`${usersTable.lastActiveAt} DESC NULLS LAST`)
            .limit(3); // Only get top 3 most recently active friends

        // Format response with activity status
        const activeFriends = friends.map(friend => {
            const lastActiveAt = friend.lastActiveAt;
            let activityStatus = "Offline";
            let minutesAgo: number | null = null;

            if (lastActiveAt) {
                const now = new Date();
                const diffMs = now.getTime() - new Date(lastActiveAt).getTime();
                minutesAgo = Math.floor(diffMs / 60000);

                if (minutesAgo < 1) {
                    activityStatus = "Active now";
                } else if (minutesAgo < 60) {
                    activityStatus = `Active ${minutesAgo}m ago`;
                } else if (minutesAgo < 1440) { // Less than 24 hours
                    const hoursAgo = Math.floor(minutesAgo / 60);
                    activityStatus = `Active ${hoursAgo}h ago`;
                } else {
                    const daysAgo = Math.floor(minutesAgo / 1440);
                    activityStatus = `Active ${daysAgo}d ago`;
                }
            }

            return {
                id: friend.id,
                firstName: friend.firstName,
                lastName: friend.lastName,
                username: friend.username,
                avatarUrl: friend.avatarUrl,
                lastActiveAt: friend.lastActiveAt,
                activityStatus,
                minutesAgo,
                isOnline: minutesAgo !== null && minutesAgo < 5, // Online if active within 5 minutes
            };
        });

        res.json(activeFriends);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching active friends" });
    }
};

// Cache for friend suggestions (5 minutes TTL)
const suggestionsCache = new Map<string, { data: any[], timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Get People You May Know (Friend Suggestions)
export const getPeopleYouMayKnow = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Check cache first
        const cached = suggestionsCache.get(userId);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            return res.json(cached.data);
        }

        // Get user's friends count
        const friendships = await dbClient
            .select()
            .from(friendshipsTable)
            .where(
                and(
                    or(eq(friendshipsTable.userId1, userId), eq(friendshipsTable.userId2, userId)),
                    eq(friendshipsTable.status, "accepted")
                )
            );

        const hasFriends = friendships.length > 0;
        let suggestions: any[] = [];

        if (!hasFriends) {
            // Strategy 1: Suggest by student ID proximity (5 before, 5 after)
            suggestions = await suggestByStudentId(userId);
        } else {
            // Strategy 2: Suggest friends of friends
            suggestions = await suggestFriendsOfFriends(userId, friendships);
        }

        // Cache the results
        suggestionsCache.set(userId, {
            data: suggestions,
            timestamp: Date.now()
        });

        res.json(suggestions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching friend suggestions" });
    }
};

// Strategy 1: Suggest users with nearby student IDs
const suggestByStudentId = async (userId: string) => {
    // Get current user's studentId
    const currentUser = await dbClient
        .select({ studentId: usersTable.studentId })
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);

    if (currentUser.length === 0 || !currentUser[0].studentId) {
        return [];
    }

    const myStudentId = currentUser[0].studentId;

    // Get 5 users before (lower student IDs)
    const usersBefore = await dbClient
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
            and(
                sql`${usersTable.studentId} < ${myStudentId}`,
                sql`${usersTable.studentId} IS NOT NULL`,
                sql`${usersTable.id} != ${userId}`
            )
        )
        .orderBy(sql`${usersTable.studentId} DESC`)
        .limit(5);

    // Get 5 users after (higher student IDs)
    const usersAfter = await dbClient
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
            and(
                sql`${usersTable.studentId} > ${myStudentId}`,
                sql`${usersTable.studentId} IS NOT NULL`,
                sql`${usersTable.id} != ${userId}`
            )
        )
        .orderBy(sql`${usersTable.studentId} ASC`)
        .limit(5);

    // Combine and add suggestion reason
    const suggestions = [...usersBefore.reverse(), ...usersAfter].map(user => ({
        ...user,
        mutualFriendsCount: 0,
        suggestionReason: "nearby_student_id"
    }));

    return suggestions;
};

// Strategy 2: Suggest friends of friends
const suggestFriendsOfFriends = async (userId: string, myFriendships: any[]) => {
    // Get my friend IDs
    const myFriendIds = myFriendships.map(f =>
        f.userId1 === userId ? f.userId2 : f.userId1
    );

    if (myFriendIds.length === 0) {
        return [];
    }

    // Get friends of my friends
    const friendsOfFriendships = await dbClient
        .select()
        .from(friendshipsTable)
        .where(
            and(
                or(
                    sql`${friendshipsTable.userId1} IN (${sql.join(myFriendIds.map(id => sql`${id}`), sql`, `)})`,
                    sql`${friendshipsTable.userId2} IN (${sql.join(myFriendIds.map(id => sql`${id}`), sql`, `)})`
                ),
                eq(friendshipsTable.status, "accepted")
            )
        );

    // Extract unique friend-of-friend IDs
    const friendOfFriendIds = new Set<string>();
    friendsOfFriendships.forEach(f => {
        const fofId = myFriendIds.includes(f.userId1) ? f.userId2 : f.userId1;
        // Exclude self and existing friends
        if (fofId !== userId && !myFriendIds.includes(fofId)) {
            friendOfFriendIds.add(fofId);
        }
    });

    if (friendOfFriendIds.size === 0) {
        return [];
    }

    const fofArray = Array.from(friendOfFriendIds);

    // Get user details for friends of friends
    const suggestions = await dbClient
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
        .where(sql`${usersTable.id} IN (${sql.join(fofArray.map(id => sql`${id}`), sql`, `)})`);

    // Calculate mutual friends count for each suggestion
    const suggestionsWithMutual = suggestions.map(user => {
        // Count how many of my friends are also friends with this user
        const mutualCount = friendsOfFriendships.filter(f =>
            (f.userId1 === user.id || f.userId2 === user.id) &&
            (myFriendIds.includes(f.userId1) || myFriendIds.includes(f.userId2))
        ).length;

        return {
            ...user,
            mutualFriendsCount: mutualCount,
            suggestionReason: "friend_of_friend"
        };
    });

    // Sort by mutual friends count (descending) and randomly select 10
    const sorted = suggestionsWithMutual.sort((a, b) => b.mutualFriendsCount - a.mutualFriendsCount);

    // Shuffle and take 10
    const shuffled = sorted.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 10);
};


// Get friends list by user ID (public profile view)
export const getFriendsByUserId = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        // Get all accepted friendships for this user
        const friendships = await dbClient
            .select()
            .from(friendshipsTable)
            .where(
                and(
                    or(eq(friendshipsTable.userId1, userId), eq(friendshipsTable.userId2, userId)),
                    eq(friendshipsTable.status, "accepted")
                )
            );

        if (friendships.length === 0) {
            return res.json([]);
        }

        // Get friend IDs
        const friendIds = friendships.map(f =>
            f.userId1 === userId ? f.userId2 : f.userId1
        );

        // Fetch user details for these friends
        const friends = await dbClient
            .select({
                id: usersTable.id,
                firstName: usersTable.firstName,
                lastName: usersTable.lastName,
                username: usersTable.username,
                avatarUrl: usersTable.avatarUrl,
                faculty: usersTable.faculty,
                major: usersTable.major,
                year: usersTable.year,
            })
            .from(usersTable)
            .where(sql`${usersTable.id} IN (${sql.join(friendIds.map(id => sql`${id}`), sql`, `)})`);

        res.json(friends);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching user friends list" });
    }
};

export const getFriendshipStatus = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { otherUserId } = req.params;

        if (userId === otherUserId) {
            return res.json({ status: "self", pendingDirection: null, requestId: null });
        }

        const friendship = await dbClient.query.friendshipsTable.findFirst({
            where: or(
                and(eq(friendshipsTable.userId1, userId), eq(friendshipsTable.userId2, otherUserId)),
                and(eq(friendshipsTable.userId1, otherUserId), eq(friendshipsTable.userId2, userId))
            ),
        });

        if (!friendship) {
            return res.json({ status: "not_friend", pendingDirection: null, requestId: null });
        }

        if (friendship.status === "accepted") {
            return res.json({ status: "friend", pendingDirection: null, requestId: friendship.id });
        }

        if (friendship.status === "pending") {
            const isSender = friendship.userId1 === userId;
            return res.json({
                status: "pending",
                pendingDirection: isSender ? "sent" : "received",
                requestId: friendship.id
            });
        }

        // Fallback for blocked or other statuses if any
        return res.json({ status: friendship.status, pendingDirection: null, requestId: friendship.id });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching friendship status" });
    }
};
