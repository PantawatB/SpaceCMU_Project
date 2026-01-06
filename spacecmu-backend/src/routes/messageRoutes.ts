import { Router } from "express";
import {
    sendMessage,
    getConversation,
} from "../controllers/messageController.js";

const router = Router();

router.post("/", sendMessage);
router.get("/:userId1/:userId2", getConversation);

export default router;
