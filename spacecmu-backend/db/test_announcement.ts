import { dbClient } from "./client.js";
import { announcementsTable, usersTable } from "./schema.js";
import { eq, or, and } from "drizzle-orm";

async function verifyAnnouncements() {
    console.log("--- Verifying Announcement System ---");

    try {
        // 1. Create a dummy Admin User (Announcements need authorId)
        const [adminUser] = await dbClient.insert(usersTable).values({
            email: `admin_announce_${Date.now()}@example.com`,
            username: `admin_announce_${Date.now()}`,
            firstName: "Admin",
            lastName: "Tester",
            role: "admin",
            status: "active"
        }).returning();

        // 2. Create a dummy Target User
        const [targetUser] = await dbClient.insert(usersTable).values({
            email: `target_announce_${Date.now()}@example.com`,
            username: `target_announce_${Date.now()}`,
            firstName: "Target",
            lastName: "User",
            role: "user",
            status: "active"
        }).returning();

        // 3. Create a dummy Other User (Should verify they don't see private)
        const [otherUser] = await dbClient.insert(usersTable).values({
            email: `other_announce_${Date.now()}@example.com`,
            username: `other_announce_${Date.now()}`,
            firstName: "Other",
            lastName: "User",
            role: "user",
            status: "active"
        }).returning();

        // 4. Test Global Announcement
        console.log("Creating Global Announcement...");
        const [globalAnnounce] = await dbClient.insert(announcementsTable).values({
            authorId: adminUser.id,
            content: "Global message test",
            type: "global"
        }).returning();

        if (globalAnnounce.type === 'global' && !globalAnnounce.targetUserId) {
            console.log("✅ Global announcement created successfully");
        } else {
            console.error("❌ Failed to create global announcement");
        }

        // 5. Test Private Announcement
        console.log("Creating Private Announcement...");
        const [privateAnnounce] = await dbClient.insert(announcementsTable).values({
            authorId: adminUser.id,
            content: "Private message test",
            type: "private",
            targetUserId: targetUser.id
        }).returning();

        if (privateAnnounce.type === 'private' && privateAnnounce.targetUserId === targetUser.id) {
            console.log("✅ Private announcement created successfully");
        } else {
            console.error("❌ Failed to create private announcement");
        }

        // 6. Verify Fetching Logic (Simulate Controller Logic)
        console.log("Verifying Fetching Logic for Target User...");
        const targetUserAnnouncements = await dbClient
            .select()
            .from(announcementsTable)
            .where(
                or(
                    eq(announcementsTable.type, "global"),
                    and(
                        eq(announcementsTable.type, "private"),
                        eq(announcementsTable.targetUserId, targetUser.id)
                    )
                )
            );

        const hasGlobal = targetUserAnnouncements.some(a => a.id === globalAnnounce.id);
        const hasPrivate = targetUserAnnouncements.some(a => a.id === privateAnnounce.id);

        if (hasGlobal && hasPrivate) {
            console.log("✅ Target user sees both Global and Private messages");
        } else {
            console.error(`❌ Target user missing messages. Global: ${hasGlobal}, Private: ${hasPrivate}`);
        }

        console.log("Verifying Fetching Logic for Other User...");
        const otherUserAnnouncements = await dbClient
            .select()
            .from(announcementsTable)
            .where(
                or(
                    eq(announcementsTable.type, "global"),
                    and(
                        eq(announcementsTable.type, "private"),
                        eq(announcementsTable.targetUserId, otherUser.id)
                    )
                )
            );

        const otherHasGlobal = otherUserAnnouncements.some(a => a.id === globalAnnounce.id);
        const otherHasPrivate = otherUserAnnouncements.some(a => a.id === privateAnnounce.id);

        if (otherHasGlobal && !otherHasPrivate) {
            console.log("✅ Other user sees Global only (Correct)");
        } else {
            console.error(`❌ Other user visibility error. Global: ${otherHasGlobal}, Private: ${otherHasPrivate}`);
        }

        // Cleanup
        await dbClient.delete(announcementsTable).where(eq(announcementsTable.authorId, adminUser.id));
        await dbClient.delete(usersTable).where(eq(usersTable.id, adminUser.id));
        await dbClient.delete(usersTable).where(eq(usersTable.id, targetUser.id));
        await dbClient.delete(usersTable).where(eq(usersTable.id, otherUser.id));
        console.log("Cleanup done.");

    } catch (error) {
        console.error("Error:", error);
    } finally {
        process.exit(0);
    }
}

verifyAnnouncements();
