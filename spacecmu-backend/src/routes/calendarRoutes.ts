import { Router } from "express";
import {
    createEvent,
    getUserEvents,
} from "../controllers/calendarController.js";

const router = Router();

router.post("/", createEvent);
router.get("/me", getUserEvents);

export default router;
