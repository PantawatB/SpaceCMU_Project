import { dbClient } from "./client.js";
import { usersTable, friendshipsTable } from "./schema.js";

async function checkUsers() {
    try {
        const users = await dbClient.select({
            id: usersTable.id,
            firstName: usersTable.firstName,
            lastName: usersTable.lastName,
            friendsCount: usersTable.friendsCount
        }).from(usersTable);

        const friendships = await dbClient.select().from(friendshipsTable);

        console.log("\n--- Users ---");
        console.table(users);
        console.log("\n--- Friendships ---");
        console.table(friendships);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkUsers();
