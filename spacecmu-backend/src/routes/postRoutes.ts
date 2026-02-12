import { Router } from "express";
import {
    getAllPosts,
    createPost,
    createPostWithMedia,
    deletePost,
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
    getPostsByUserId,
    getCommentsByPostId,
    acceptEventFromPost,
} from "../controllers/postController.js";
import { sessionMiddleware } from "../middleware/sessionMiddleware.js";
import { uploadMultiple } from "../middleware/uploadMiddleware.js";

const router = Router();

router.get("/", getAllPosts);
router.post("/", sessionMiddleware, createPost);
router.post("/media", sessionMiddleware, uploadMultiple.array("media", 20), createPostWithMedia); // Max 20 files
router.delete("/:postId", sessionMiddleware, deletePost);
router.get("/:postId/likes", getPostLikes);
router.post("/like", sessionMiddleware, likePost);
router.post("/repost", sessionMiddleware, repostPost);
router.post("/comment", sessionMiddleware, uploadMultiple.array("media", 10), addComment); // Max 10 files for comments
router.delete("/comment/:commentId", sessionMiddleware, deleteComment);
router.post("/save", sessionMiddleware, toggleSavePost);
router.get("/saved/me", sessionMiddleware, getSavedPosts);
router.get("/reposted/me", sessionMiddleware, getRepostedPosts);
router.get("/liked/me", sessionMiddleware, getLikedPosts);
router.get("/me", sessionMiddleware, getUserPosts);
router.get("/user/:userId", getPostsByUserId); // Get posts by user ID
router.post("/:postId/accept-event", sessionMiddleware, acceptEventFromPost); // Accept event from post
router.get("/:postId/comments", getCommentsByPostId);

export default router;
