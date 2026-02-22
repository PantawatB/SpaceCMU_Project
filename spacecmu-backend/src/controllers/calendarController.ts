import type { Request, Response } from "express";
import { dbClient } from "../../db/client.js";
import { calendarEventsTable } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { getUserIdFromRequest } from "../utils/authUtils.js";

// ─── UTC-safe day boundary helpers (Asia/Bangkok = UTC+7) ────────────────────
// Frontend (browser) อยู่ใน Asia/Bangkok ส่งวันที่เป็น "YYYY-MM-DD"
// Backend+DB ทำงานใน UTC → แปลงขอบเขต "start/end of day" ให้เป็น UTC range
// เช่น วัน "2026-02-22" ของ user = 2026-02-21T17:00:00Z ถึง 2026-02-22T16:59:59Z
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7

function utcStartOfDay(dateStr: string): Date {
    // "YYYY-MM-DD" → midnight Bangkok → UTC
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - BANGKOK_OFFSET_MS);
}

function utcEndOfDay(dateStr: string): Date {
    // "YYYY-MM-DD" → 23:59:59.999 Bangkok → UTC
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) - BANGKOK_OFFSET_MS);
}

function todayDateStrBangkok(): string {
    // คืนวันที่ปัจจุบันในรูปแบบ "YYYY-MM-DD" ตาม Asia/Bangkok timezone
    const nowBangkok = new Date(Date.now() + BANGKOK_OFFSET_MS);
    const y = nowBangkok.getUTCFullYear();
    const m = String(nowBangkok.getUTCMonth() + 1).padStart(2, "0");
    const d = String(nowBangkok.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}
// ─────────────────────────────────────────────────────────────────────────────

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

        // Log Activity
        await import("../utils/activityLogger.js").then(({ logActivity }) => {
            logActivity(userId, "Created event", `Created event: ${title}`, req);
        });
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
            // Filter for specific date — ใช้ UTC-safe boundaries (Asia/Bangkok)
            const startOfDay = utcStartOfDay(date as string);
            const endOfDay = utcEndOfDay(date as string);

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
                conditions.push(gte(calendarEventsTable.startTime, utcStartOfDay(startDate as string)));
            }

            if (endDate) {
                conditions.push(lte(calendarEventsTable.startTime, utcEndOfDay(endDate as string)));
            }

            query = dbClient
                .select()
                .from(calendarEventsTable)
                .where(and(...conditions));
        } else {
            // Default: Show today's events (วันนี้ใน Asia/Bangkok)
            const todayStr = todayDateStrBangkok();
            const startOfToday = utcStartOfDay(todayStr);
            const endOfToday = utcEndOfDay(todayStr);

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

export const getTodayEvents = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const todayStr = todayDateStrBangkok();
        const startOfToday = utcStartOfDay(todayStr);
        const endOfToday = utcEndOfDay(todayStr);

        const { and, gte, lte } = await import("drizzle-orm");

        const events = await dbClient
            .select()
            .from(calendarEventsTable)
            .where(
                and(
                    eq(calendarEventsTable.userId, userId),
                    gte(calendarEventsTable.startTime, startOfToday),
                    lte(calendarEventsTable.startTime, endOfToday)
                )
            )
            .orderBy(calendarEventsTable.startTime);

        // Reuse countdown logic
        const now = new Date();
        const eventsWithCountdown = events.map(event => {
            const startTime = new Date(event.startTime);
            const endTime = event.endTime ? new Date(event.endTime) : null;
            const diffMs = startTime.getTime() - now.getTime();
            const totalSeconds = Math.floor(diffMs / 1000);
            const isUpcoming = startTime > now;
            const isPast = endTime ? endTime < now : startTime < now;
            const isOngoing = !isUpcoming && !isPast;

            let countdown;
            if (isUpcoming) {
                const absDiffMs = Math.abs(diffMs);
                const years = Math.floor(absDiffMs / (1000 * 60 * 60 * 24 * 365));
                const months = Math.floor((absDiffMs % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));
                const days = Math.floor((absDiffMs % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24));
                const hours = Math.floor((absDiffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((absDiffMs % (1000 * 60 * 60)) / (1000 * 60));

                countdown = { years, months, days, hours, minutes, totalSeconds, isUpcoming: true, isPast: false, isOngoing: false };
            } else if (isOngoing) {
                countdown = { years: 0, months: 0, days: 0, hours: 0, minutes: 0, totalSeconds: 0, isUpcoming: false, isPast: false, isOngoing: true };
            } else {
                const endTimeToUse = endTime || startTime;
                const timeSinceMs = now.getTime() - endTimeToUse.getTime();
                const absTimeSinceMs = Math.abs(timeSinceMs);
                const years = Math.floor(absTimeSinceMs / (1000 * 60 * 60 * 24 * 365));
                const months = Math.floor((absTimeSinceMs % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));
                const days = Math.floor((absTimeSinceMs % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24));
                const hours = Math.floor((absTimeSinceMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((absTimeSinceMs % (1000 * 60 * 60)) / (1000 * 60));

                countdown = {
                    years: 0, months: 0, days: 0, hours: 0, minutes: 0, totalSeconds: 0,
                    isUpcoming: false, isPast: true, isOngoing: false,
                    timeSince: { years, months, days, hours, minutes, totalSeconds: Math.floor(timeSinceMs / 1000) }
                };
            }
            return { ...event, countdown };
        });

        res.json(eventsWithCountdown);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching today's events" });
    }
};

// Get events by specific date
export const getEventsByDate = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ message: "date query param is required (YYYY-MM-DD)" });
        }

        const { and, gte, lte } = await import("drizzle-orm");

        // Parse the date and build start/end of day boundaries (Asia/Bangkok → UTC)
        if (isNaN(new Date(date as string).getTime())) {
            return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
        }

        const startOfDay = utcStartOfDay(date as string);
        const endOfDay = utcEndOfDay(date as string);

        const events = await dbClient
            .select()
            .from(calendarEventsTable)
            .where(
                and(
                    eq(calendarEventsTable.userId, userId),
                    gte(calendarEventsTable.startTime, startOfDay),
                    lte(calendarEventsTable.startTime, endOfDay)
                )
            )
            .orderBy(calendarEventsTable.startTime);

        res.json(events);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching events by date" });
    }
};
