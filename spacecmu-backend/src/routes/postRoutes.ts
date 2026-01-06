import { Router } from "express";
import {
    getAllPosts,
    createPost,
    likePost,
    addComment,
    savePost,
    getSavedPosts,
} from "../controllers/postController.js";

const router = Router();

router.get("/", getAllPosts);
router.post("/", createPost);
router.post("/like", likePost);
router.post("/comment", addComment);
router.post("/save", savePost);
router.get("/saved/:userId", getSavedPosts);

export default router;
