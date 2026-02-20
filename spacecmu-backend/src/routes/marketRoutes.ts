import { Router } from "express";
import {
    getMarketItems,
    getAllCategories,
    createMarketItem,
    createMarketItemWithImage,
    contactSeller,
    getMyMarketItems,
    getMarketItemsByUserId,
} from "../controllers/marketController.js";
import { sessionMiddleware } from "../middleware/sessionMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = Router();

router.get("/items", sessionMiddleware, getMarketItems);
router.get("/items/me", sessionMiddleware, getMyMarketItems); // Get current user's items
router.get("/user/:userId/items", sessionMiddleware, getMarketItemsByUserId); // Get items by user ID
router.get("/categories", sessionMiddleware, getAllCategories);
router.post("/items", sessionMiddleware, createMarketItem);
router.post("/items/upload", sessionMiddleware, upload.array("images", 10), createMarketItemWithImage);
router.post("/contact-seller", sessionMiddleware, contactSeller);

export default router;
