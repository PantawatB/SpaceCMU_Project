import { dbClient } from "./client.js";
import { activitiesTable, usersTable, postsTable } from "./schema.js";
import { eq, desc } from "drizzle-orm";
import { logActivity } from "../src/utils/activityLogger.js";

async function testActivityLog() {
    console.log("Starting Activity Log Test...");

    try {
        // 1. Get a user
        const users = await dbClient.select().from(usersTable).limit(1);
        if (users.length === 0) {
            console.error("No users found to test with.");
            return;
        }
        const user = users[0];
        console.log(`Testing with user: ${user.firstName} (${user.id})`);

        // 2. Clear existing logs for clarity (optional, maybe just create new ones)
        // await dbClient.delete(activitiesTable);

        // 3. Create some manual logs using the utility
        console.log("Creating manual activity logs...");
        await logActivity(user.id, "Test Action 1", "Details for test action 1", { ip: "127.0.0.1" } as any);
        await logActivity(user.id, "Test Action 2", "Details for test action 2");

        console.log("Logs created.");

        // 4. Verify logs exist in DB
        console.log("Verifying logs in database...");
        const logs = await dbClient
            .select()
            .from(activitiesTable)
            .where(eq(activitiesTable.userId, user.id))
            .orderBy(desc(activitiesTable.createdAt))
            .limit(5);

        console.log(`Found ${logs.length} logs for user.`);
        logs.forEach(log => {
            console.log(`- [${log.createdAt}] ${log.action}: ${log.details} (IP: ${log.ipAddress})`);
        });

        if (logs.length >= 2) {
            console.log("✅ Activity logging utility works.");
        } else {
            console.error("❌ Failed to create/retrieve logs.");
        }

        // 5. Simulate Admin Fetch (like the controller does)
        console.log("Simulating Admin Fetch...");
        const adminFetch = await dbClient
            .select({
                id: activitiesTable.id,
                action: activitiesTable.action,
                userFirstName: usersTable.firstName
            })
            .from(activitiesTable)
            .leftJoin(usersTable, eq(activitiesTable.userId, usersTable.id))
            .orderBy(desc(activitiesTable.createdAt))
            .limit(5);

        console.log("Admin fetch result:");
        console.table(adminFetch);

        if (adminFetch.length > 0 && adminFetch[0].userFirstName) {
            console.log("✅ Admin fetch query works and joins user data.");
        } else {
            console.error("❌ Admin fetch query failed or didn't join user.");
        }

    } catch (error) {
        console.error("Test failed:", error);
    } finally {
        process.exit(0);
    }
}

testActivityLog();
