import { Router } from "express";
import { getUserAnnouncements } from "../controllers/announcementController.js";
import { sessionMiddleware } from "../middleware/sessionMiddleware.js";

const router = Router();

router.use(sessionMiddleware);

router.get("/", getUserAnnouncements);

export default router;
