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

// Get ALL events (no date filtering)
export const getAllEvents = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const events = await dbClient
            .select()
            .from(calendarEventsTable)
            .where(eq(calendarEventsTable.userId, userId));

        // Calculate countdown for each event
        const now = new Date();
        const eventsWithCountdown = events.map(event => {
            const startTime = new Date(event.startTime);
            const endTime = event.endTime ? new Date(event.endTime) : null;

            // Calculate time difference in milliseconds
            const diffMs = startTime.getTime() - now.getTime();
            const totalSeconds = Math.floor(diffMs / 1000);

            // Determine event status
            const isUpcoming = startTime > now;
            const isPast = endTime ? endTime < now : startTime < now;
            const isOngoing = !isUpcoming && !isPast;

            // Calculate countdown components
            let countdown;
            if (isUpcoming) {
                const absDiffMs = Math.abs(diffMs);
                const years = Math.floor(absDiffMs / (1000 * 60 * 60 * 24 * 365));
                const months = Math.floor((absDiffMs % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));
                const days = Math.floor((absDiffMs % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24));
                const hours = Math.floor((absDiffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((absDiffMs % (1000 * 60 * 60)) / (1000 * 60));

                countdown = {
                    years,
                    months,
                    days,
                    hours,
                    minutes,
                    totalSeconds,
                    isUpcoming: true,
                    isPast: false,
                    isOngoing: false
                };
            } else if (isOngoing) {
                countdown = {
                    years: 0,
                    months: 0,
                    days: 0,
                    hours: 0,
                    minutes: 0,
                    totalSeconds: 0,
                    isUpcoming: false,
                    isPast: false,
                    isOngoing: true
                };
            } else {
                // Past event - calculate time since event ended
                const endTimeToUse = endTime || startTime;
                const timeSinceMs = now.getTime() - endTimeToUse.getTime();
                const absTimeSinceMs = Math.abs(timeSinceMs);

                const years = Math.floor(absTimeSinceMs / (1000 * 60 * 60 * 24 * 365));
                const months = Math.floor((absTimeSinceMs % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));
                const days = Math.floor((absTimeSinceMs % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24));
                const hours = Math.floor((absTimeSinceMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((absTimeSinceMs % (1000 * 60 * 60)) / (1000 * 60));

                countdown = {
                    years: 0,
                    months: 0,
                    days: 0,
                    hours: 0,
                    minutes: 0,
                    totalSeconds: 0,
                    isUpcoming: false,
                    isPast: true,
                    isOngoing: false,
                    timeSince: {
                        years,
                        months,
                        days,
                        hours,
                        minutes,
                        totalSeconds: Math.floor(timeSinceMs / 1000)
                    }
                };
            }

            return {
                ...event,
                countdown
            };
        });

        res.json(eventsWithCountdown);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching events" });
    }
};

export const getUserEvents = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Get query parameters for date filtering
        const { date, startDate, endDate } = req.query;

        // Default to today's events if no parameters provided
        const { and, gte, lte } = await import("drizzle-orm");
        let query;

        if (date) {
            // Filter for specific date (start of day to end of day)
            const targetDate = new Date(date as string);
            const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
            const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

            query = dbClient
                .select()
                .from(calendarEventsTable)
                .where(
                    and(
                        eq(calendarEventsTable.userId, userId),
                        gte(calendarEventsTable.startTime, startOfDay),
                        lte(calendarEventsTable.startTime, endOfDay)
                    )
                );
        } else if (startDate || endDate) {
            const conditions = [eq(calendarEventsTable.userId, userId)];

            if (startDate) {
                const start = new Date(startDate as string);
                start.setHours(0, 0, 0, 0);
                conditions.push(gte(calendarEventsTable.startTime, start));
            }

            if (endDate) {
                const end = new Date(endDate as string);
                end.setHours(23, 59, 59, 999);
                conditions.push(lte(calendarEventsTable.startTime, end));
            }

            query = dbClient
                .select()
                .from(calendarEventsTable)
                .where(and(...conditions));
        } else {
            // Default: Show today's events
            const today = new Date();
            const startOfToday = new Date(today.setHours(0, 0, 0, 0));
            const endOfToday = new Date(today.setHours(23, 59, 59, 999));

            query = dbClient
                .select()
                .from(calendarEventsTable)
                .where(
                    and(
                        eq(calendarEventsTable.userId, userId),
                        gte(calendarEventsTable.startTime, startOfToday),
                        lte(calendarEventsTable.startTime, endOfToday)
                    )
                );
        }

        const events = await query;

        // Calculate countdown for each event
        const now = new Date();
        const eventsWithCountdown = events.map(event => {
            const startTime = new Date(event.startTime);
            const endTime = event.endTime ? new Date(event.endTime) : null;

            // Calculate time difference in milliseconds
            const diffMs = startTime.getTime() - now.getTime();
            const totalSeconds = Math.floor(diffMs / 1000);

            // Determine event status
            const isUpcoming = startTime > now;
            const isPast = endTime ? endTime < now : startTime < now;
            const isOngoing = !isUpcoming && !isPast;

            // Calculate countdown components
            let countdown;
            if (isUpcoming) {
                const absDiffMs = Math.abs(diffMs);
                const years = Math.floor(absDiffMs / (1000 * 60 * 60 * 24 * 365));
                const months = Math.floor((absDiffMs % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));
                const days = Math.floor((absDiffMs % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24));
                const hours = Math.floor((absDiffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((absDiffMs % (1000 * 60 * 60)) / (1000 * 60));

                countdown = {
                    years,
                    months,
                    days,
                    hours,
                    minutes,
                    totalSeconds,
                    isUpcoming: true,
                    isPast: false,
                    isOngoing: false
                };
            } else if (isOngoing) {
                countdown = {
                    years: 0,
                    months: 0,
                    days: 0,
                    hours: 0,
                    minutes: 0,
                    totalSeconds: 0,
                    isUpcoming: false,
                    isPast: false,
                    isOngoing: true
                };
            } else {
                // Past event - calculate time since event ended
                const endTimeToUse = endTime || startTime;
                const timeSinceMs = now.getTime() - endTimeToUse.getTime();
                const absTimeSinceMs = Math.abs(timeSinceMs);

                const years = Math.floor(absTimeSinceMs / (1000 * 60 * 60 * 24 * 365));
                const months = Math.floor((absTimeSinceMs % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));
                const days = Math.floor((absTimeSinceMs % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24));
                const hours = Math.floor((absTimeSinceMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((absTimeSinceMs % (1000 * 60 * 60)) / (1000 * 60));

                countdown = {
                    years: 0,
                    months: 0,
                    days: 0,
                    hours: 0,
                    minutes: 0,
                    totalSeconds: 0,
                    isUpcoming: false,
                    isPast: true,
                    isOngoing: false,
                    timeSince: {
                        years,
                        months,
                        days,
                        hours,
                        minutes,
                        totalSeconds: Math.floor(timeSinceMs / 1000)
                    }
                };
            }

            return {
                ...event,
                countdown
            };
        });

        res.json(eventsWithCountdown);
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

// Toggle event status between completed (success) and cancelled (unsuccess)
export const toggleEventStatus = async (req: Request, res: Response) => {
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

        // Toggle status: completed <-> cancelled
        const currentStatus = event[0].status;
        let newStatus: "completed" | "cancelled";

        if (currentStatus === "completed") {
            newStatus = "cancelled";
        } else if (currentStatus === "cancelled") {
            newStatus = "completed";
        } else {
            // If pending, default to completed
            newStatus = "completed";
        }

        // Update status
        const [updatedEvent] = await dbClient
            .update(calendarEventsTable)
            .set({ status: newStatus })
            .where(eq(calendarEventsTable.id, eventId))
            .returning();

        res.json({
            message: `Event marked as ${newStatus}`,
            event: updatedEvent,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error toggling event status" });
    }
};
