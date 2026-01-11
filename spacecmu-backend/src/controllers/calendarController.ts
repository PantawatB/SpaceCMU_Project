import type { Request, Response } from "express";
import { dbClient } from "../../db/client.js";
import { calendarEventsTable } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { getUserIdFromRequest } from "../utils/authUtils.js";

export const createEvent = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { title, description, startTime, endTime, type } = req.body;
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
        const userId = req.session?.activeUserId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
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
