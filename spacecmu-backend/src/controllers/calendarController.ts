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

// Mark event as completed (Success button)
export const updateEventStatus = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { eventId } = req.params;
        const { status } = req.body; // "completed", "cancelled", "pending"

        // Verify event belongs to user
        const event = await dbClient
            .select()
            .from(calendarEventsTable)
            .where(eq(calendarEventsTable.id, eventId))
            .limit(1);

        if (event.length === 0) {
            return res.status(404).json({ message: "Event not found" });
        }

        if (event[0].userId !== userId) {
            return res.status(403).json({ message: "Forbidden" });
        }

        // Update status
        const [updatedEvent] = await dbClient
            .update(calendarEventsTable)
            .set({ status })
            .where(eq(calendarEventsTable.id, eventId))
            .returning();

        res.json(updatedEvent);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error updating event status" });
    }
};

// Delete event
export const deleteEvent = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { eventId } = req.params;

        // Verify event belongs to user
        const event = await dbClient
            .select()
            .from(calendarEventsTable)
            .where(eq(calendarEventsTable.id, eventId))
            .limit(1);

        if (event.length === 0) {
            return res.status(404).json({ message: "Event not found" });
        }

        if (event[0].userId !== userId) {
            return res.status(403).json({ message: "Forbidden" });
        }

        // Delete event
        await dbClient
            .delete(calendarEventsTable)
            .where(eq(calendarEventsTable.id, eventId));

        res.json({ message: "Event deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error deleting event" });
    }
};
