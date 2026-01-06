import { Router } from "express";
import {
    sendFriendRequest,
    respondToRequest,
    getFriendsList,
} from "../controllers/friendController.js";

const router = Router();

router.post("/request", sendFriendRequest);
router.post("/respond", respondToRequest);
router.get("/:userId", getFriendsList);

export default router;
