import { Router } from "express";
import {
    getNotifications,
    markAsRead,
    markAllAsReadForUser,
    deleteNotification,
    deleteAllNotifications,
} from "../controllers/notificationController.js";
import { sessionMiddleware } from "../middleware/sessionMiddleware.js";

const router = Router();

router.get("/:userId", getNotifications);
router.post("/read", markAsRead);
router.patch("/:userId/read-all", sessionMiddleware, markAllAsReadForUser);

// Delete routes require authentication
router.delete("/all", sessionMiddleware, deleteAllNotifications);
router.delete("/:notificationId", sessionMiddleware, deleteNotification);

export default router;
