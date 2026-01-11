import { Router } from "express";
import {
    sendFriendRequest,
    respondToRequest,
    getFriendsList,
    getPendingRequests,
    deleteFriend,
} from "../controllers/friendController.js";
import { sessionMiddleware } from "../middleware/sessionMiddleware.js";

const router = Router();

router.post("/request", sessionMiddleware, sendFriendRequest);
router.post("/respond", sessionMiddleware, respondToRequest);
router.get("/me", sessionMiddleware, getFriendsList);
router.get("/requests/me", sessionMiddleware, getPendingRequests);
router.delete("/:friendId", sessionMiddleware, deleteFriend);

export default router;
