import { Router } from "express";
import {
    createEvent,
    getUserEvents,
    updateEventStatus,
    deleteEvent,
} from "../controllers/calendarController.js";
import { sessionMiddleware } from "../middleware/sessionMiddleware.js";

const router = Router();

router.post("/", sessionMiddleware, createEvent);
router.get("/me", sessionMiddleware, getUserEvents);
router.patch("/:eventId/status", sessionMiddleware, updateEventStatus);
router.delete("/:eventId", sessionMiddleware, deleteEvent);

export default router;
