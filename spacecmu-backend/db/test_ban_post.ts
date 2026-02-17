import { dbClient } from "./client.js";
import { postsTable, usersTable } from "./schema.js";
import { eq, ne, and } from "drizzle-orm";

async function verifyBanPost() {
    console.log("--- Verifying Ban/Unban Post Logic ---");

    try {
        // 1. Create a dummy Test User and Post
        const [user] = await dbClient.insert(usersTable).values({
            email: `test_ban_post_${Date.now()}@example.com`,
            username: `test_ban_post_${Date.now()}`,
            firstName: "Test",
            lastName: "Poster",
            isAnonymous: false,
            role: "user",
            status: "active"
        }).returning();

        const [post] = await dbClient.insert(postsTable).values({
            userId: user.id,
            content: "This content will be banned",
            category: "Global",
            status: "active"
        }).returning();

        console.log(`Created Post: ${post.id}, Status: ${post.status}`);

        // 2. Verify it is visible (status != banned)
        const [visiblePost] = await dbClient
            .select()
            .from(postsTable)
            .where(and(eq(postsTable.id, post.id), ne(postsTable.status, "banned")));

        if (!visiblePost) {
            console.error("❌ Post should be visible initially");
        } else {
            console.log("✅ Post is visible initially");
        }

        // 3. Ban the post
        await dbClient
            .update(postsTable)
            .set({ status: "banned" })
            .where(eq(postsTable.id, post.id));

        console.log("Ban action performed.");

        // 4. Verify it is NOT visible to standard query
        const [bannedPostVisible] = await dbClient
            .select()
            .from(postsTable)
            .where(and(eq(postsTable.id, post.id), ne(postsTable.status, "banned")));

        if (bannedPostVisible) {
            console.error("❌ Post is still visible after ban");
        } else {
            console.log("✅ Post is hidden after ban");
        }

        // 5. Unban the post
        await dbClient
            .update(postsTable)
            .set({ status: "active" })
            .where(eq(postsTable.id, post.id));

        console.log("Unban action performed.");

        // 6. Verify it is visible again
        const [unbannedPostVisible] = await dbClient
            .select()
            .from(postsTable)
            .where(and(eq(postsTable.id, post.id), ne(postsTable.status, "banned")));

        if (!unbannedPostVisible) {
            console.error("❌ Post should be visible after unban");
        } else {
            console.log("✅ Post is visible after unban");
        }

        // Cleanup
        await dbClient.delete(postsTable).where(eq(postsTable.id, post.id));
        await dbClient.delete(usersTable).where(eq(usersTable.id, user.id));
        console.log("Cleanup done.");

    } catch (error) {
        console.error("Error:", error);
    } finally {
        process.exit(0);
    }
}

verifyBanPost();
