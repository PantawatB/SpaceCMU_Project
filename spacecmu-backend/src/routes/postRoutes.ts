import { Router } from "express";
import {
    getAllPosts,
    createPost,
    likePost,
    getPostLikes,
    addComment,
    deleteComment,
    sharePost,
    toggleSavePost,
    getSavedPosts,
    getSharedPosts,
    getUserPosts,
} from "../controllers/postController.js";

const router = Router();

router.get("/", getAllPosts);
router.post("/", createPost);
router.get("/:postId/likes", getPostLikes);
router.post("/like", likePost);
router.post("/share", sharePost);
router.post("/comment", addComment);
router.delete("/comment/:commentId", deleteComment);
router.post("/save", toggleSavePost);
router.get("/saved/:userId", getSavedPosts);
router.get("/shared/:userId", getSharedPosts);
router.get("/user/:userId", getUserPosts);

export default router;
