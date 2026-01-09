import { dbClient } from "./client.js";
import { usersTable, friendshipsTable } from "./schema.js";
import { eq, sql } from "drizzle-orm";

async function testIncrement() {
    try {
        const userId = '051db532-8b8b-4351-87dc-0304d60606f8'; // ohm
        console.log(`Testing increment for user ${userId}`);

        const before = await dbClient.select({ friendsCount: usersTable.friendsCount })
            .from(usersTable).where(eq(usersTable.id, userId));
        console.log(`Before:`, before[0]);

        const result = await dbClient.update(usersTable)
            .set({ friendsCount: sql`COALESCE(${usersTable.friendsCount}, 0) + 1` })
            .where(eq(usersTable.id, userId))
            .returning({ count: usersTable.friendsCount });

        console.log(`After:`, result[0]);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

testIncrement();
