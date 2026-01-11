import { Router } from "express";
import {
    getAllPosts,
    createPost,
    likePost,
    getPostLikes,
    addComment,
    deleteComment,
    repostPost,
    toggleSavePost,
    getSavedPosts,
    getRepostedPosts,
    getLikedPosts,
    getUserPosts,
    getCommentsByPostId,
} from "../controllers/postController.js";
import { sessionMiddleware } from "../middleware/sessionMiddleware.js";

const router = Router();

router.get("/", getAllPosts);
router.post("/", sessionMiddleware, createPost);
router.get("/:postId/likes", getPostLikes);
router.post("/like", sessionMiddleware, likePost);
router.post("/repost", sessionMiddleware, repostPost);
router.post("/comment", sessionMiddleware, addComment);
router.delete("/comment/:commentId", sessionMiddleware, deleteComment);
router.post("/save", sessionMiddleware, toggleSavePost);
router.get("/saved/me", sessionMiddleware, getSavedPosts);
router.get("/reposted/me", sessionMiddleware, getRepostedPosts);
router.get("/liked/me", sessionMiddleware, getLikedPosts);
router.get("/me", sessionMiddleware, getUserPosts);
router.get("/:postId/comments", getCommentsByPostId);

export default router;
