import { dbClient } from "./client.js";
import { usersTable } from "./schema.js";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

async function testProfileUpdates() {
    try {
        const userId = '051db532-8b8b-4351-87dc-0304d60606f8'; // ohm
        console.log(`--- Testing Profile Updates for User: ${userId} ---`);

        // 1. Test Bio Update
        console.log("\n1. Updating Bio...");
        const newBio = "Hello, this is a test bio " + Date.now();
        await dbClient.update(usersTable)
            .set({ bio: newBio })
            .where(eq(usersTable.id, userId));

        const userAfterBio = await dbClient.select({ bio: usersTable.bio })
            .from(usersTable).where(eq(usersTable.id, userId));
        console.log("Updated Bio:", userAfterBio[0].bio);

        // 2. Simulate Avatar Upload and then Removal
        console.log("\n2. Testing Avatar Management...");

        // Create a dummy file
        const dummyFileName = `test-avatar-${Date.now()}.jpg`;
        const dummyRelativePath = `/uploads/${dummyFileName}`;
        const dummyFullPath = path.join(process.cwd(), dummyRelativePath);

        if (!fs.existsSync(path.join(process.cwd(), "uploads"))) {
            fs.mkdirSync(path.join(process.cwd(), "uploads"));
        }
        fs.writeFileSync(dummyFullPath, "fake image content");
        console.log(`Created dummy avatar at: ${dummyFullPath}`);

        // Set avatar in DB
        await dbClient.update(usersTable)
            .set({ avatarUrl: dummyRelativePath })
            .where(eq(usersTable.id, userId));
        console.log("Set avatarUrl in DB to:", dummyRelativePath);

        // Verify set
        const userWithAvatar = await dbClient.select({ avatarUrl: usersTable.avatarUrl })
            .from(usersTable).where(eq(usersTable.id, userId));
        console.log("Current avatarUrl in DB:", userWithAvatar[0].avatarUrl);

        // Now Simulate Removal (as done in controller)
        console.log("\n3. Simulating Avatar Removal...");
        const oldAvatarUrl = userWithAvatar[0].avatarUrl;

        // Logical "removeAvatar" trigger
        if (oldAvatarUrl && oldAvatarUrl.startsWith("/uploads/")) {
            const oldFilePath = path.join(process.cwd(), oldAvatarUrl);
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
                console.log("File physically deleted from uploads/");
            }
        }

        await dbClient.update(usersTable)
            .set({ avatarUrl: null })
            .where(eq(usersTable.id, userId));
        console.log("Set avatarUrl to NULL in DB.");

        // Final check
        const finalUser = await dbClient.select({ bio: usersTable.bio, avatarUrl: usersTable.avatarUrl })
            .from(usersTable).where(eq(usersTable.id, userId));
        console.log("Final state - Bio:", finalUser[0].bio, "AvatarUrl:", finalUser[0].avatarUrl);
        console.log("File exists check after deletion:", fs.existsSync(dummyFullPath));

        console.log("\n--- Test Complete ---");
        process.exit(0);
    } catch (error) {
        console.error("Test failed:", error);
        process.exit(1);
    }
}

testProfileUpdates();
