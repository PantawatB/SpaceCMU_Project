import { Router } from "express";
import {
    createEvent,
    getUserEvents,
} from "../controllers/calendarController.js";
import { sessionMiddleware } from "../middleware/sessionMiddleware.js";

const router = Router();

router.post("/", sessionMiddleware, createEvent);
router.get("/me", sessionMiddleware, getUserEvents);

export default router;
