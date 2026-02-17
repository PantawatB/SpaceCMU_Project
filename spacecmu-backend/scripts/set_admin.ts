import { dbClient } from "../db/client.js";
import { usersTable } from "../db/schema.js";
import { eq } from "drizzle-orm";

const email = process.argv[2];

if (!email) {
    console.error("Please provide an email address.");
    process.exit(1);
}

async function setAdmin() {
    try {
        const [user] = await dbClient
            .select()
            .from(usersTable)
            .where(eq(usersTable.email, email));

        if (!user) {
            console.error(`User with email ${email} not found.`);
            process.exit(1);
        }

        await dbClient
            .update(usersTable)
            .set({ role: "admin" })
            .where(eq(usersTable.id, user.id));

        console.log(`User ${email} has been promoted to admin.`);
    } catch (error) {
        console.error("Error setting admin:", error);
    } finally {
        process.exit(0);
    }
}

setAdmin();
