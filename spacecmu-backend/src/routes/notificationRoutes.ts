import { Router } from "express";
import {
    getNotifications,
    markAsRead,
    deleteNotification,
    deleteAllNotifications,
} from "../controllers/notificationController.js";
import { sessionMiddleware } from "../middleware/sessionMiddleware.js";

const router = Router();

router.get("/:userId", getNotifications);
router.post("/read", markAsRead);

// Delete routes require authentication
router.delete("/all", sessionMiddleware, deleteAllNotifications);
router.delete("/:notificationId", sessionMiddleware, deleteNotification);

export default router;
