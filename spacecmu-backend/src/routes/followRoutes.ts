import { Router } from "express";
import { followUser, unfollowUser, getFollowStatus } from "../controllers/followController.js";
import { sessionMiddleware } from "../middleware/sessionMiddleware.js";

const router = Router();

router.post("/", sessionMiddleware, followUser);
router.delete("/:followingId", sessionMiddleware, unfollowUser);
router.get("/status/:followingId", sessionMiddleware, getFollowStatus);

export default router;
