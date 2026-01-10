import { Router } from "express";
import {
    getAllUsers,
    getUserById,
    createUser,
    deleteUser,
    updateProfile,
    getMe,
} from "../controllers/userController.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = Router();

router.get("/me", getMe);
router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.post("/", createUser);
router.patch("/:id", upload.single("avatar"), updateProfile);
router.delete("/:id", deleteUser);


export default router;
