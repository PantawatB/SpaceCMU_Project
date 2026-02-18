import { Router } from "express";
import {
    createEvent,
    getAllEvents,
    getUserEvents,
    updateEventStatus,
    deleteEvent,
    toggleEventStatus,
    getTodayEvents,
    getEventsByDate,
} from "../controllers/calendarController.js";
import { sessionMiddleware } from "../middleware/sessionMiddleware.js";

const router = Router();

router.post("/", sessionMiddleware, createEvent);
router.get("/all", sessionMiddleware, getAllEvents); // Get ALL events
router.get("/today", sessionMiddleware, getTodayEvents); // Get Today's events
router.get("/date", sessionMiddleware, getEventsByDate); // GET /api/calendar/date?date=YYYY-MM-DD
router.get("/me", sessionMiddleware, getUserEvents); // Get events by date range
router.patch("/:eventId/status", sessionMiddleware, updateEventStatus);
router.patch("/:eventId/toggle", sessionMiddleware, toggleEventStatus); // Toggle between success/unsuccess
router.delete("/:eventId", sessionMiddleware, deleteEvent);

export default router;
