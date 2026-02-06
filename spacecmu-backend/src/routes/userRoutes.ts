import { Router } from "express";
import {
    getAllUsers,
    getUserById,
    createUser,
    deleteUser,
    updateBio,
    updateAvatar,
    deleteAvatar,
    searchUsers,
} from "../controllers/userController.js";
import { getMe } from "../controllers/authController.js";
import { upload } from "../middleware/uploadMiddleware.js";
import { sessionMiddleware } from "../middleware/sessionMiddleware.js";

const router = Router();

router.get("/me", sessionMiddleware, getMe);
router.get("/search", sessionMiddleware, searchUsers);
router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.post("/", createUser);
router.patch("/profile/bio", sessionMiddleware, updateBio);
router.patch("/profile/avatar", sessionMiddleware, upload.single("avatar"), updateAvatar);
router.delete("/profile/avatar", sessionMiddleware, deleteAvatar);
router.delete("/account", sessionMiddleware, deleteUser);

export default router;
