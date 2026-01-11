import { Router } from "express";
import {
    getAllUsers,
    getUserById,
    createUser,
    deleteUser,
    updateBio,
    updateAvatar,
    deleteAvatar,
    getMe,
} from "../controllers/userController.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = Router();

router.get("/me", getMe);
router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.post("/", createUser);
router.patch("/profile/bio", updateBio);
router.patch("/profile/avatar", upload.single("avatar"), updateAvatar);
router.delete("/profile/avatar", deleteAvatar);
router.delete("/account", deleteUser);


export default router;
