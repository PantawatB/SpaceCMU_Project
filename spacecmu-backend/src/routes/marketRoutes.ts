import { Router } from "express";
import {
    getMarketItems,
    getAllCategories,
    createMarketItem,
    createMarketItemWithImage,
    contactSeller,
} from "../controllers/marketController.js";
import { sessionMiddleware } from "../middleware/sessionMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = Router();

router.get("/items", getMarketItems);
router.get("/categories", getAllCategories);
router.post("/items", sessionMiddleware, createMarketItem);
router.post("/items/upload", sessionMiddleware, upload.array("images", 10), createMarketItemWithImage);
router.post("/contact-seller", sessionMiddleware, contactSeller);

export default router;
