import { Router } from "express";
import {
    getAllUsers,
    getUserById,
    createUser,
    deleteUser,
} from "../controllers/userController.js";

const router = Router();

router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.post("/", createUser);
router.delete("/:id", deleteUser);


export default router;
