import { Router } from "express";
import {
    createEvent,
    getUserEvents,
} from "../controllers/calendarController.js";

const router = Router();

router.post("/", createEvent);
router.get("/:userId", getUserEvents);

export default router;
