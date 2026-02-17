import { Router } from "express";
import { getDashboardStats, banUser, unbanUser, banPost, unbanPost, createAnnouncement, getActivities } from "../controllers/adminController.js";
import { sessionMiddleware } from "../middleware/sessionMiddleware.js";
import { adminMiddleware } from "../middleware/adminMiddleware.js";

const router = Router();

// Protect all admin routes
router.use(sessionMiddleware);
router.use(adminMiddleware);

router.get("/stats", getDashboardStats);
router.get("/activities", getActivities);
router.post("/users/:userId/ban", banUser);
router.post("/users/:userId/unban", unbanUser);
router.post("/posts/:postId/ban", banPost);
router.post("/posts/:postId/unban", unbanPost);
router.post("/announcements", createAnnouncement);

export default router;
