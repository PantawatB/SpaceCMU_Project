import { dbClient } from "./client.js";
import { usersTable, postsTable, sessionsTable } from "./schema.js";
import { eq, count, sql } from "drizzle-orm";

async function testAdminStats() {
    console.log("--- Testing Admin Stats Logic ---");

    try {
        // 1. Total Users (excluding anonymous)
        const [totalUsersResult] = await dbClient
            .select({ count: count() })
            .from(usersTable)
            .where(eq(usersTable.isAnonymous, false));
        console.log("Total Users (non-anon):", totalUsersResult?.count);

        // 2. Active Users
        const [activeUsersResult] = await dbClient
            .select({ count: sql<number>`count(distinct ${sessionsTable.activeUserId})` })
            .from(sessionsTable);
        console.log("Active Users:", activeUsersResult?.count);

        // 3. Total Posts
        const [totalPostsResult] = await dbClient
            .select({ count: count() })
            .from(postsTable);
        console.log("Total Posts:", totalPostsResult?.count);

        // 4. Banned Users
        const [bannedUsersResult] = await dbClient
            .select({ count: count() })
            .from(usersTable)
            .where(eq(usersTable.status, "banned"));
        console.log("Banned Users:", bannedUsersResult?.count);

    } catch (error) {
        console.error("Error:", error);
    } finally {
        process.exit(0);
    }
}

testAdminStats();
