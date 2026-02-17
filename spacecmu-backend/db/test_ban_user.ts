import { dbClient } from "./client.js";
import { usersTable } from "./schema.js";
import { eq } from "drizzle-orm";

async function verifyBanUnban() {
    console.log("--- Verifying Ban/Unban Logic ---");

    try {
        // 1. Create a dummy Test User
        const testEmail = `test_ban_${Date.now()}@example.com`;
        const [newUser] = await dbClient.insert(usersTable).values({
            email: testEmail,
            username: `test_ban_${Date.now()}`,
            firstName: "Test",
            lastName: "Ban",
            isAnonymous: false,
            role: "user",
            status: "active"
        }).returning();

        console.log(`Created test user: ${newUser.email} (${newUser.id}), Status: ${newUser.status}`);

        // 2. Ban the user (Simulate Controller Logic)
        await dbClient
            .update(usersTable)
            .set({ status: "banned" })
            .where(eq(usersTable.id, newUser.id));

        const [bannedUser] = await dbClient
            .select()
            .from(usersTable)
            .where(eq(usersTable.id, newUser.id));

        console.log(`After Ban -> Status: ${bannedUser.status}`);
        if (bannedUser.status !== "banned") {
            console.error("❌ Failed to ban user");
        } else {
            console.log("✅ Ban successful");
        }

        // 3. Unban the user
        await dbClient
            .update(usersTable)
            .set({ status: "active" })
            .where(eq(usersTable.id, newUser.id));

        const [unbannedUser] = await dbClient
            .select()
            .from(usersTable)
            .where(eq(usersTable.id, newUser.id));

        console.log(`After Unban -> Status: ${unbannedUser.status}`);
        if (unbannedUser.status !== "active") {
            console.error("❌ Failed to unban user");
        } else {
            console.log("✅ Unban successful");
        }

        // Cleanup
        await dbClient.delete(usersTable).where(eq(usersTable.id, newUser.id));
        console.log("Cleanup: Test user deleted.");

    } catch (error) {
        console.error("Error:", error);
    } finally {
        process.exit(0);
    }
}

verifyBanUnban();
