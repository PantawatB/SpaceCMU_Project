import { Router } from "express";
import {
    getMarketItems,
    getAllCategories,
    createMarketItem,
    createMarketItemWithImage,
    contactSeller,
    getMyMarketItems,
} from "../controllers/marketController.js";
import { sessionMiddleware } from "../middleware/sessionMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = Router();

router.get("/items", getMarketItems);
router.get("/items/me", sessionMiddleware, getMyMarketItems); // Get my listed items
router.get("/categories", getAllCategories);
router.post("/items", sessionMiddleware, createMarketItem);
router.post("/items/upload", sessionMiddleware, upload.single("image"), createMarketItemWithImage);
router.post("/contact-seller", sessionMiddleware, contactSeller);

export default router;
