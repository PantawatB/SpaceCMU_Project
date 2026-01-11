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

const router = Router();

// Conversation management
router.get("/conversations/:userId", getUserConversations);
router.get("/conversation/:userId1/:userId2", getConversation);

// Send and manage messages
router.post("/", sendMessage);
router.patch("/:messageId/read", markAsRead);
router.patch("/read-all", markAllAsRead);
router.delete("/:messageId", deleteMessage);

// Unread and search
router.get("/unread/:userId", getUnreadCount);
router.get("/search", searchMessages);

export default router;
