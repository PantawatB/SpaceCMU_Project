import { Router } from "express";
import {
    getAllPosts,
    getPostById,
    getPostByCommentId,
    createPost,
    createPostWithMedia,
    deletePost,
    editPost,
    likePost,
    getPostLikes,
    addComment,
    editComment,
    deleteComment,
    likeComment,
    repostPost,
    toggleSavePost,
    getSavedPosts,
    getRepostedPosts,
    getLikedPosts,
    getUserPosts,
    getPostsByUserId,
    getCommentsByPostId,
    acceptEventFromPost,
    getEventFromPost,
    getRepostsByUserId,
    getLikedPostsByUserId,
    searchPosts,
} from "../controllers/postController.js";
import { sessionMiddleware, optionalSessionMiddleware } from "../middleware/sessionMiddleware.js";
import { uploadMultiple } from "../middleware/uploadMiddleware.js";

const router = Router();

// optionalSessionMiddleware: attaches session when token is present (needed for Friends feed),
// but does not block unauthenticated requests.
router.get("/", optionalSessionMiddleware, getAllPosts);
router.get("/search", optionalSessionMiddleware, searchPosts); // Search posts with access control
router.post("/", sessionMiddleware, createPost);
router.post("/media", sessionMiddleware, uploadMultiple.array("media", 20), createPostWithMedia); // Max 20 files
router.delete("/:postId", sessionMiddleware, deletePost);
router.patch("/:postId", sessionMiddleware, uploadMultiple.array("media", 20), editPost);
router.get("/:postId/likes", getPostLikes);
router.post("/like", sessionMiddleware, likePost);
router.post("/repost", sessionMiddleware, repostPost);
router.post("/comment", sessionMiddleware, uploadMultiple.array("media", 10), addComment); // Max 10 files for comments
router.patch("/comment/:commentId", sessionMiddleware, editComment);
router.delete("/comment/:commentId", sessionMiddleware, deleteComment);
router.post("/comment/like", sessionMiddleware, likeComment);
router.post("/save", sessionMiddleware, toggleSavePost);
router.get("/saved/me", sessionMiddleware, getSavedPosts);
router.get("/reposted/me", sessionMiddleware, getRepostedPosts);
router.get("/liked/me", sessionMiddleware, getLikedPosts);
router.get("/me", sessionMiddleware, getUserPosts);
router.get("/user/:userId", optionalSessionMiddleware, getPostsByUserId); // Get posts by user ID — optional auth (Friends posts hidden from non-friends)
router.get("/user/:userId/reposts", sessionMiddleware, getRepostsByUserId); // Get reposts by user ID
router.get("/user/:userId/liked", sessionMiddleware, getLikedPostsByUserId); // Get liked posts by user ID
router.get("/:postId/event", optionalSessionMiddleware, getEventFromPost); // Get event data for a post
router.post("/:postId/accept-event", sessionMiddleware, acceptEventFromPost); // Accept event from post
router.get("/:postId/comments", optionalSessionMiddleware, getCommentsByPostId);
router.get("/comment/:commentId/post", optionalSessionMiddleware, getPostByCommentId); // Get post by commentId (for comment_like notifications)
router.get("/:postId", optionalSessionMiddleware, getPostById); // Get single post by ID

export default router;
