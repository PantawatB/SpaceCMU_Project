import type { Request, Response } from "express";
import { dbClient } from "../../db/client.js";
import { calendarEventsTable } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export const createEvent = async (req: Request, res: Response) => {
    try {
        const { userId, title, description, startTime, endTime, type } = req.body;
        const newEvent = await dbClient
            .insert(calendarEventsTable)
            .values({
                userId,
                title,
                description,
                startTime: new Date(startTime),
                endTime: endTime ? new Date(endTime) : null,
                type: type || "event",
            })
            .returning();
        res.status(201).json(newEvent[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error creating event" });
    }
};

export const getUserEvents = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const events = await dbClient
            .select()
            .from(calendarEventsTable)
            .where(eq(calendarEventsTable.userId, userId));
        res.json(events);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching events" });
    }
};
