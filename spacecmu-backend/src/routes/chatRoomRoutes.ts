import { Router } from "express";
import {
    createDirectRoom,
    createGroupRoom,
    getUserRooms,
    getRoomDetails,
    updateRoom,
    addMember,
    removeMember,
    leaveRoom,
} from "../controllers/chatRoomController.js";
import { sessionMiddleware } from "../middleware/sessionMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = Router();

// Create rooms
router.post("/direct", sessionMiddleware, createDirectRoom);
router.post("/group", sessionMiddleware, upload.single("avatar"), createGroupRoom);

// Get rooms
router.get("/me", sessionMiddleware, getUserRooms);
router.get("/:roomId", sessionMiddleware, getRoomDetails);

// Update room (supports multipart/form-data for avatar upload)
router.patch("/:roomId", sessionMiddleware, upload.single("avatar"), updateRoom);

// Manage members
router.post("/:roomId/members", sessionMiddleware, addMember);
router.delete("/:roomId/members/:targetUserId", sessionMiddleware, removeMember);
router.post("/:roomId/leave", sessionMiddleware, leaveRoom);

export default router;
