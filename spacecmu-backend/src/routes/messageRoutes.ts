import { Router } from "express";
import {
    sendMessage,
    getRoomMessages,
    markRoomAsRead,
    getRoomReaders,
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

const router = Router();

// New room-based endpoints
router.post("/", sessionMiddleware, sendMessage);
router.get("/room/:roomId", sessionMiddleware, getRoomMessages);
router.patch("/room/:roomId/read", sessionMiddleware, markRoomAsRead);
router.get("/room/:roomId/readers", sessionMiddleware, getRoomReaders);
router.delete("/:messageId", sessionMiddleware, deleteMessage);
router.get("/search", sessionMiddleware, searchMessages);

// Deprecated endpoints (backward compatibility)
router.get("/conversations/me", sessionMiddleware, getUserConversations);
router.get("/conversation/:userId1/:userId2", sessionMiddleware, getConversation);
router.patch("/:messageId/read", sessionMiddleware, markAsRead);
router.patch("/read-all", sessionMiddleware, markAllAsRead);
router.get("/unread/me", sessionMiddleware, getUnreadCount);

export default router;
