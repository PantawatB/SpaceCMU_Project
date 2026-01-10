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

const router = Router();

router.get("/", getAllPosts);
router.post("/", createPost);
router.get("/:postId/likes", getPostLikes);
router.post("/like", likePost);
router.post("/repost", repostPost);
router.post("/comment", addComment);
router.delete("/comment/:commentId", deleteComment);
router.post("/save", toggleSavePost);
router.get("/saved/me", getSavedPosts);
router.get("/reposted/me", getRepostedPosts);
router.get("/liked/me", getLikedPosts);
router.get("/me", getUserPosts);
router.get("/:postId/comments", getCommentsByPostId);

export default router;
