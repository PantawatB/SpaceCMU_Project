import { dbClient } from "./client.js";
import { usersTable } from "./schema.js";

async function listUsers() {
    console.log("--- Listing Users ---");
    const users = await dbClient.select().from(usersTable);
    console.log(`Found ${users.length} users:`);
    users.forEach(u => console.log(`- ${u.email} (Role: ${u.role})`));
    process.exit(0);
}

listUsers();
