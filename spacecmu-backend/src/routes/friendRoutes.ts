import { Router } from "express";
import {
    sendFriendRequest,
    respondToRequest,
    getFriendsList,
    getPendingRequests,
    deleteFriend,
} from "../controllers/friendController.js";

const router = Router();

router.post("/request", sendFriendRequest);
router.post("/respond", respondToRequest);
router.get("/:userId", getFriendsList);
router.get("/requests/:userId", getPendingRequests);
router.delete("/:userId/:friendId", deleteFriend);

export default router;
