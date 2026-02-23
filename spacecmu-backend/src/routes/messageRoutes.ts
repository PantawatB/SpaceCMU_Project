import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import {
    sendMessage,
    sendMessageWithMedia,
    getRoomMessages,
    markRoomAsRead,
    getRoomReaders,
    editMessage,
    deleteMessage,
    searchMessages,
    // Deprecated functions (backward compatibility)
    getConversation,
    getUserConversations,
    markAsRead,
    markAllAsRead,
    getUnreadCount,
} from "../controllers/messageController.js";
import { sessionMiddleware } from "../middleware/sessionMiddleware.js";
import { uploadMultiple } from "../middleware/uploadMiddleware.js";

const router = Router();

// New room-based endpoints
router.post("/", sessionMiddleware, sendMessage);
router.post(
    "/room/:roomId/media",
    sessionMiddleware,
    (req: Request, res: Response, next: NextFunction) => {
        uploadMultiple.array("media", 15)(req, res, (err) => {
            if (err instanceof multer.MulterError || err instanceof Error) {
                return res.status(400).json({ message: err.message });
            }
            next(err);
        });
    },
    sendMessageWithMedia
);
router.get("/room/:roomId", sessionMiddleware, getRoomMessages);
router.patch("/room/:roomId/read", sessionMiddleware, markRoomAsRead);
router.get("/room/:roomId/readers", sessionMiddleware, getRoomReaders);
router.delete("/:messageId", sessionMiddleware, deleteMessage);
router.patch("/:messageId/read", sessionMiddleware, markAsRead);
router.patch("/:messageId", sessionMiddleware, editMessage);
router.get("/search", sessionMiddleware, searchMessages);

// Deprecated endpoints (backward compatibility)
router.get("/conversations/me", sessionMiddleware, getUserConversations);
router.get("/conversation/:userId1/:userId2", sessionMiddleware, getConversation);
router.patch("/read-all", sessionMiddleware, markAllAsRead);
router.get("/unread/me", sessionMiddleware, getUnreadCount);

export default router;
