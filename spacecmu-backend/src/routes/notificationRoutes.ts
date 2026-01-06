import { Router } from "express";
import {
    getNotifications,
    markAsRead,
} from "../controllers/notificationController.js";

const router = Router();

router.get("/:userId", getNotifications);
router.post("/read", markAsRead);

export default router;
