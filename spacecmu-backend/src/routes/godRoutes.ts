import { Router } from "express";
import { getPlatformStats, getAllUsers, setUserRole, setUserStatus, getFullActivityLog } from "../controllers/godController.js";
import { sessionMiddleware } from "../middleware/sessionMiddleware.js";
import { godMiddleware } from "../middleware/godMiddleware.js";

const router = Router();

// Protect all god routes — must be authenticated AND have role "god"
router.use(sessionMiddleware);
router.use(godMiddleware);

router.get("/stats", getPlatformStats);
router.get("/users", getAllUsers);
router.patch("/users/:userId/role", setUserRole);
router.patch("/users/:userId/status", setUserStatus);
router.get("/activities", getFullActivityLog);

export default router;
