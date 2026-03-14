import { Router } from "express";
import {
    getPlatformStats,
    getAllUsers,
    setUserRole,
    setUserStatus,
    getFullActivityLog,
    createOfficialAccount,
    getOfficialAccounts,
    addOfficialAccountAdmin,
    removeOfficialAccountAdmin,
    searchUsersForOfficialAccount,
    sendGlobalNotification,
    sendPrivateNotifications,
    getSentNotifications,
    searchAllUsers,
} from "../controllers/godController.js";
import { sessionMiddleware } from "../middleware/sessionMiddleware.js";
import { godMiddleware } from "../middleware/godMiddleware.js";

const router = Router();

// session-only routes (any logged-in user)
router.use(sessionMiddleware);

// Search users for official account — excludes official_account role
// accessible by any authenticated user (admin/god), not god-only
router.get("/users/search", searchUsersForOfficialAccount);

// Protect all remaining routes — must have role "god"
router.use(godMiddleware);

router.get("/stats", getPlatformStats);
router.get("/users", getAllUsers);
router.patch("/users/:userId/role", setUserRole);
router.patch("/users/:userId/status", setUserStatus);
router.get("/activities", getFullActivityLog);

// Search all users including official_account (for private message recipients)
router.get("/users/search-all", searchAllUsers);

// Official Accounts
router.get("/official-accounts", getOfficialAccounts);
router.post("/official-accounts", createOfficialAccount);
router.post("/official-accounts/:id/admins", addOfficialAccountAdmin);
router.delete("/official-accounts/:id/admins/:adminUserId", removeOfficialAccountAdmin);

// Notifications (god broadcast)
router.post("/notifications/global", sendGlobalNotification);
router.post("/notifications/private", sendPrivateNotifications);
router.get("/notifications/sent", getSentNotifications);

export default router;
