import { dbClient, dbConn } from "@db/client.js";
import {
  usersTable,
  postsTable,
  commentsTable,
  likesTable,
  notificationsTable,
  marketCategoriesTable,
  marketItemsTable,
} from "@db/schema.js";


async function main() {
  console.log("--- Starting Verification ---");

  // 1. Get or Create User
  let user = (await dbClient.select().from(usersTable).limit(1))[0];
  if (!user) {
    console.log("Creating mock user...");
    const newUser = await dbClient.insert(usersTable).values({
      firstName: "Test",
      lastName: "User",
      email: `test${Date.now()}@cmu.ac.th`,
      username: `user_${Date.now()}`,
    }).returning();
    user = newUser[0];
  }

  // 2. Get or Create Post
  let post = (await dbClient.select().from(postsTable).limit(1))[0];
  if (!post) {
    console.log("Creating mock post...");
    const newPost = await dbClient.insert(postsTable).values({
      userId: user.id,
      content: "This is a verification post",
      category: "Global",
    }).returning();
    post = newPost[0];
  }

  console.log(`Using User: ${user.id}`);
  console.log(`Using Post: ${post.id}`);

  // 2. Create a comment
  console.log("Creating comment...");
  const comment = await dbClient
    .insert(commentsTable)
    .values({
      userId: user.id,
      postId: post.id,
      content: "This is a test comment from prototype.ts",
    })
    .returning();
  console.log("Comment created:", comment[0].id);

  // 3. Like a post
  console.log("Liking post...");
  try {
    const like = await dbClient
      .insert(likesTable)
      .values({
        userId: user.id,
        postId: post.id,
      })
      .returning();
    console.log("Like created:", like[0].id);
  } catch (err: any) {
    if (err.code === "23505") {
      console.log("User already liked this post (expected unique constraint).");
    } else {
      console.error("Error liking post:", err);
    }
  }

  // 4. Create a notification
  console.log("Creating notification...");
  const notification = await dbClient
    .insert(notificationsTable)
    .values({
      recipientId: user.id,
      senderId: user.id, // Self-notification for testing
      type: "comment",
      referenceId: comment[0].id,
      isRead: false,
    })
    .returning();
  console.log("Notification created:", notification[0].id);

  // 5. Market Verification
  console.log("--- Market Verification ---");
  // Get or Create Category
  let category = (await dbClient.select().from(marketCategoriesTable).limit(1))[0];
  if (!category) {
    console.log("Creating 'Electronics' category...");
    const newCat = await dbClient.insert(marketCategoriesTable).values({
      name: "Electronics",
    }).returning();
    category = newCat[0];
  }
  console.log(`Using Category: ${category.name} (${category.id})`);

  // Create Market Item
  console.log("Creating Market Item...");
  const item = await dbClient.insert(marketItemsTable).values({
    sellerId: user.id,
    title: "Old Laptop",
    description: "Works fine, just old.",
    price: "5000.00",
    categoryId: category.id,
  }).returning();
  console.log("Market Item Created:", item[0].id);

  console.log("--- Verification Complete ---");
  dbConn.end();
}

main();