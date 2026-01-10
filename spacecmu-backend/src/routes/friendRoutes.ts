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
router.get("/me", getFriendsList);
router.get("/requests/me", getPendingRequests);
router.delete("/:friendId", deleteFriend);

export default router;
