import { Router } from "express";
import { getDashboardStats, banUser, unbanUser, banPost, unbanPost, createAnnouncement, getActivities, getMyOfficialAccounts, addAdminToMyAccount, removeAdminFromMyAccount, leaveOfficialAccount, transferOwnership } from "../controllers/adminController.js";
import { sessionMiddleware } from "../middleware/sessionMiddleware.js";
import { adminMiddleware } from "../middleware/adminMiddleware.js";
import { godMiddleware } from "../middleware/godMiddleware.js";

const router = Router();

// Protect all admin routes
router.use(sessionMiddleware);
router.use(adminMiddleware);

router.get("/stats", getDashboardStats);
router.get("/activities", getActivities);
router.get("/my-official-accounts", getMyOfficialAccounts);
router.post("/my-official-accounts/:id/admins", addAdminToMyAccount);
router.delete("/my-official-accounts/:id/admins/:adminUserId", removeAdminFromMyAccount);
router.delete("/my-official-accounts/:id/leave", leaveOfficialAccount);
router.post("/my-official-accounts/:id/transfer-owner", transferOwnership);

// Ban/unban USER — god only (more powerful than admin)
router.post("/users/:userId/ban", godMiddleware, banUser);
router.post("/users/:userId/unban", godMiddleware, unbanUser);

// Ban/unban POST — admin + god
router.post("/posts/:postId/ban", banPost);
router.post("/posts/:postId/unban", unbanPost);

router.post("/announcements", createAnnouncement);

export default router;
