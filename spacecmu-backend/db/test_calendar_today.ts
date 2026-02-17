import { dbClient } from "./client.js";
import { calendarEventsTable, usersTable } from "./schema.js";
import { eq, and, gte, lte } from "drizzle-orm";

async function testCalendarToday() {
    console.log("Starting Calendar Today Test...");

    try {
        // 1. Get a user
        const users = await dbClient.select().from(usersTable).limit(1);
        if (users.length === 0) {
            console.error("No users found.");
            process.exit(1);
        }
        const user = users[0];
        console.log(`Testing with user: ${user.firstName} (${user.id})`);

        // 2. Clear existing events for this user (for clean test)
        await dbClient.delete(calendarEventsTable).where(eq(calendarEventsTable.userId, user.id));

        // 3. Create Events
        const today = new Date();
        const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

        console.log("Creating Setup Data...");
        // Event 1: Today
        await dbClient.insert(calendarEventsTable).values({
            userId: user.id,
            title: "Event Today",
            description: "This should be returned",
            startTime: today,
            endTime: new Date(today.getTime() + 3600000), // +1 hour
            type: "event"
        });

        // Event 2: Yesterday
        await dbClient.insert(calendarEventsTable).values({
            userId: user.id,
            title: "Event Yesterday",
            description: "This should NOT be returned",
            startTime: yesterday,
            type: "event"
        });

        // Event 3: Tomorrow
        await dbClient.insert(calendarEventsTable).values({
            userId: user.id,
            title: "Event Tomorrow",
            description: "This should NOT be returned",
            startTime: tomorrow,
            type: "event"
        });

        // 4. Simulate `getTodayEvents` Logic
        console.log("Querying for Today's events...");
        const startOfToday = new Date(today.setHours(0, 0, 0, 0));
        const endOfToday = new Date(today.setHours(23, 59, 59, 999));

        const events = await dbClient
            .select()
            .from(calendarEventsTable)
            .where(
                and(
                    eq(calendarEventsTable.userId, user.id),
                    gte(calendarEventsTable.startTime, startOfToday),
                    lte(calendarEventsTable.startTime, endOfToday)
                )
            );

        console.log(`Found ${events.length} events for today.`);

        const todayEvent = events.find(e => e.title === "Event Today");
        const yesterdayEvent = events.find(e => e.title === "Event Yesterday");
        const tomorrowEvent = events.find(e => e.title === "Event Tomorrow");

        if (todayEvent) console.log("✅ 'Event Today' found.");
        else console.error("❌ 'Event Today' MISSING.");

        if (!yesterdayEvent) console.log("✅ 'Event Yesterday' correctly excluded.");
        else console.error("❌ 'Event Yesterday' improperly included.");

        if (!tomorrowEvent) console.log("✅ 'Event Tomorrow' correctly excluded.");
        else console.error("❌ 'Event Tomorrow' improperly included.");

    } catch (error) {
        console.error("Test failed:", error);
    } finally {
        process.exit(0);
    }
}

testCalendarToday();
