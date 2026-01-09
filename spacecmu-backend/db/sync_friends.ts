import { dbClient } from "./client.js";
import { usersTable, friendshipsTable } from "./schema.js";
import { eq, or, and, count } from "drizzle-orm";

async function syncFriendsCount() {
    try {
        console.log("Starting friendsCount synchronization...");

        const users = await dbClient.select({ id: usersTable.id }).from(usersTable);

        for (const user of users) {
            const [result] = await dbClient
                .select({ value: count() })
                .from(friendshipsTable)
                .where(
                    and(
                        or(eq(friendshipsTable.userId1, user.id), eq(friendshipsTable.userId2, user.id)),
                        eq(friendshipsTable.status, "accepted")
                    )
                );

            const friendCount = Number(result.value);

            await dbClient.update(usersTable)
                .set({ friendsCount: friendCount })
                .where(eq(usersTable.id, user.id));

            console.log(`User ${user.id}: set friendsCount to ${friendCount}`);
        }

        console.log("Synchronization complete.");
        process.exit(0);
    } catch (error) {
        console.error("Sync failed:", error);
        process.exit(1);
    }
}

syncFriendsCount();
