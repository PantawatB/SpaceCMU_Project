import { Router } from "express";
import {
    sendFriendRequest,
    respondToRequest,
    getFriendsList,
    getPendingRequests,
    deleteFriend,
    getActiveFriends,
    getPeopleYouMayKnow,
    getFriendsByUserId,
    getFriendshipStatus,
} from "../controllers/friendController.js";
import { sessionMiddleware } from "../middleware/sessionMiddleware.js";

const router = Router();

router.post("/request", sessionMiddleware, sendFriendRequest);
router.post("/respond", sessionMiddleware, respondToRequest);
router.get("/me", sessionMiddleware, getFriendsList);
router.get("/user/:userId", sessionMiddleware, getFriendsByUserId);
router.get("/status/:otherUserId", sessionMiddleware, getFriendshipStatus);
router.get("/requests/me", sessionMiddleware, getPendingRequests);
router.get("/active", sessionMiddleware, getActiveFriends);
router.get("/suggestions", sessionMiddleware, getPeopleYouMayKnow);
router.delete("/:friendId", sessionMiddleware, deleteFriend);

export default router;
