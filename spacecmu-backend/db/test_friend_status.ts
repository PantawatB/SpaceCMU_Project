import { dbClient } from "./client.js";
import { friendshipsTable, usersTable } from "./schema.js";
import { eq, or, and } from "drizzle-orm";

async function testFriendStatus() {
    console.log("Starting Friendship Status Test...");

    try {
        // 1. Get/Create 2 users for testing
        const users = await dbClient.select().from(usersTable).limit(2);
        if (users.length < 2) {
            console.error("Need at least 2 users for testing.");
            process.exit(1);
        }
        const user1 = users[0];
        const user2 = users[1];

        console.log(`User 1: ${user1.firstName} (${user1.id})`);
        console.log(`User 2: ${user2.firstName} (${user2.id})`);

        // Helper to mimic controller logic
        const checkStatus = async (u1: string, u2: string) => {
            if (u1 === u2) return { status: "self", pendingDirection: null };

            const friendship = await dbClient.query.friendshipsTable.findFirst({
                where: or(
                    and(eq(friendshipsTable.userId1, u1), eq(friendshipsTable.userId2, u2)),
                    and(eq(friendshipsTable.userId1, u2), eq(friendshipsTable.userId2, u1))
                ),
            });

            if (!friendship) return { status: "not_friend", pendingDirection: null };
            if (friendship.status === "accepted") return { status: "friend", pendingDirection: null };
            if (friendship.status === "pending") {
                return {
                    status: "pending",
                    pendingDirection: friendship.userId1 === u1 ? "sent" : "received"
                };
            }
            return { status: friendship.status, pendingDirection: null };
        };

        // 2. Setup: Clean existing friendship
        await dbClient.delete(friendshipsTable).where(
            or(
                and(eq(friendshipsTable.userId1, user1.id), eq(friendshipsTable.userId2, user2.id)),
                and(eq(friendshipsTable.userId1, user2.id), eq(friendshipsTable.userId2, user1.id))
            )
        );

        // Case 1: No friendship
        console.log("\n--- Case 1: No Relationship ---");
        const status1 = await checkStatus(user1.id, user2.id);
        console.log(`User1 checking User2:`, status1);
        if (status1.status === "not_friend") console.log("✅ Correct"); else console.error("❌ Failed");

        // Case 2: Pending (User1 -> User2)
        console.log("\n--- Case 2: Pending Request (User1 sent) ---");
        await dbClient.insert(friendshipsTable).values({
            userId1: user1.id,
            userId2: user2.id,
            status: "pending"
        });

        const status2a = await checkStatus(user1.id, user2.id); // User1 checks
        console.log(`User1 (Sender) checking User2:`, status2a);
        if (status2a.status === "pending" && status2a.pendingDirection === "sent") console.log("✅ Correct (Sent)"); else console.error("❌ Failed");

        const status2b = await checkStatus(user2.id, user1.id); // User2 checks
        console.log(`User2 (Receiver) checking User1:`, status2b);
        if (status2b.status === "pending" && status2b.pendingDirection === "received") console.log("✅ Correct (Received)"); else console.error("❌ Failed");

        // Case 3: Accepted
        console.log("\n--- Case 3: Friends ---");
        await dbClient.update(friendshipsTable)
            .set({ status: "accepted" })
            .where(and(eq(friendshipsTable.userId1, user1.id), eq(friendshipsTable.userId2, user2.id)));

        const status3 = await checkStatus(user1.id, user2.id);
        console.log(`User1 checking User2:`, status3);
        if (status3.status === "friend") console.log("✅ Correct"); else console.error("❌ Failed");

    } catch (error) {
        console.error("Test failed:", error);
    } finally {
        process.exit(0);
    }
}

testFriendStatus();
