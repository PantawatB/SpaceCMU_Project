import express from "express";
import { login, callback, getMe, switchMode } from "../controllers/authController.js";
import { sessionMiddleware } from "../middleware/sessionMiddleware.js";

const router = express.Router();

router.get("/cmu/login", login);
router.get("/cmu/callback", callback);

// Protected routes - require session
router.get("/me", sessionMiddleware, getMe);
router.post("/switch-mode", sessionMiddleware, switchMode);

export default router;
