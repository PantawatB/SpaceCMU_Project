import { Router } from "express";
import {
    sendMessage,
    getConversation,
    getUserConversations,
    markAsRead,
    markAllAsRead,
    getUnreadCount,
    deleteMessage,
    searchMessages,
} from "../controllers/messageController.js";
import { sessionMiddleware } from "../middleware/sessionMiddleware.js";

const router = Router();

// Conversation management
router.get("/conversations/me", sessionMiddleware, getUserConversations);
router.get("/conversation/:userId1/:userId2", sessionMiddleware, getConversation);

// Send and manage messages
router.post("/", sessionMiddleware, sendMessage);
router.patch("/:messageId/read", sessionMiddleware, markAsRead);
router.patch("/read-all", sessionMiddleware, markAllAsRead);
router.delete("/:messageId", sessionMiddleware, deleteMessage);

// Unread and search
router.get("/unread/me", sessionMiddleware, getUnreadCount);
router.get("/search", sessionMiddleware, searchMessages);

export default router;
