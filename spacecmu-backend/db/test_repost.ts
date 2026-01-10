import { dbClient } from "./client.js";
import { repostsTable, postsTable, usersTable } from "./schema.js";
import { eq } from "drizzle-orm";

async function testRepostPosts() {
    try {
        console.log("--- Testing Reposted Posts Logic ---");

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

        // 2. Simulate reposting (insert into repostsTable)
        console.log("\n1. Simulating Repost Post...");
        await dbClient.insert(repostsTable).values({ userId, postId });
        console.log("Inserted repost record into repostsTable.");

        // 3. Test Retrieval Logic (matching controller)
        console.log("\n2. Testing Get Reposted Posts Logic...");
        const repostedPosts = await dbClient
            .select()
            .from(repostsTable)
            .innerJoin(postsTable, eq(repostsTable.postId, postsTable.id))
            .where(eq(repostsTable.userId, userId));

        console.log(`Found ${repostedPosts.length} reposted posts for user.`);
        if (repostedPosts.length > 0) {
            console.log("Success! Reposted post found.");
            console.log("Content of reposted post:", repostedPosts[0].posts.content);
        } else {
            console.log("Error: No reposted posts found after insertion.");
        }

        console.log("\n--- Test Complete ---");
        process.exit(0);
    } catch (error) {
        console.error("Test failed:", error);
        process.exit(1);
    }
}

testRepostPosts();
