import { Router } from "express";
import {
    getUserSettings,
    updateProfile,
    uploadBanner,
    uploadAvatar,
    updateNotificationPreferences,
    updatePrivacySettings,
    deleteAccount,
    updateAppearanceSettings,
} from "../controllers/settingsController.js";
import { sessionMiddleware } from "../middleware/sessionMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = Router();

// Get user settings
router.get("/me", sessionMiddleware, getUserSettings);

// Profile settings
router.patch("/profile", sessionMiddleware, updateProfile);
router.patch("/banner", sessionMiddleware, upload.single("banner"), uploadBanner);
router.patch("/avatar", sessionMiddleware, upload.single("avatar"), uploadAvatar);

// Notification preferences
router.patch("/notifications", sessionMiddleware, updateNotificationPreferences);

// Privacy settings
router.patch("/privacy", sessionMiddleware, updatePrivacySettings);

// Appearance settings
router.patch("/appearance", sessionMiddleware, updateAppearanceSettings);

// Account management
router.delete("/account", sessionMiddleware, deleteAccount);

export default router;
