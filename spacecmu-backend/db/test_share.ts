import { dbClient } from "./client.js";
import { sharesTable, postsTable, usersTable } from "./schema.js";
import { eq } from "drizzle-orm";

async function testSharePosts() {
    try {
        console.log("--- Testing Shared Posts Logic ---");

        // Use ohm's ID
        const userId = '051db532-8b8b-4351-87dc-0304d60606f8';

        // 1. Get an existing post
        const posts = await dbClient.select().from(postsTable).limit(1);
        if (posts.length === 0) {
            console.log("No posts found to test with. Create a post first.");
            process.exit(1);
        }
        const postId = posts[0].id;
        console.log(`Testing with Post ID: ${postId} and User ID: ${userId}`);

        // 2. Simulate sharing (insert into sharesTable)
        console.log("\n1. Simulating Share Post...");
        await dbClient.insert(sharesTable).values({ userId, postId });
        console.log("Inserted share record into sharesTable.");

        // 3. Test Retrieval Logic (matching controller)
        console.log("\n2. Testing Get Shared Posts Logic...");
        const sharedPosts = await dbClient
            .select()
            .from(sharesTable)
            .innerJoin(postsTable, eq(sharesTable.postId, postsTable.id))
            .where(eq(sharesTable.userId, userId));

        console.log(`Found ${sharedPosts.length} shared posts for user.`);
        if (sharedPosts.length > 0) {
            console.log("Success! Shared post found.");
            console.log("Content of shared post:", sharedPosts[0].posts.content);
        } else {
            console.log("Error: No shared posts found after insertion.");
        }

        console.log("\n--- Test Complete ---");
        process.exit(0);
    } catch (error) {
        console.error("Test failed:", error);
        process.exit(1);
    }
}

testSharePosts();
