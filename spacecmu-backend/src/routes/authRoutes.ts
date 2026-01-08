import express from "express";
import { login, callback } from "../controllers/authController.js";

const router = express.Router();

router.get("/cmu/login", login);
router.get("/cmu/callback", callback);

export default router;
