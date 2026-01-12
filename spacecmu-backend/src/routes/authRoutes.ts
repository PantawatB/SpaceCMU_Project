import express from "express";
import { login, callback, getMe, switchMode, logout } from "../controllers/authController.js";
import { sessionMiddleware } from "../middleware/sessionMiddleware.js";

const router = express.Router();

router.get("/cmu/login", login);
router.get("/cmu/callback", callback);

// Protected routes - require session
router.get("/me", sessionMiddleware, getMe);
router.post("/switch-mode", sessionMiddleware, switchMode);
router.post("/logout", logout); // No middleware needed - works with or without session

export default router;
