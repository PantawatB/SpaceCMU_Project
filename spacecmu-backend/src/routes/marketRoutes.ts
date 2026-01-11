import { Router } from "express";
import {
    getMarketItems,
    getAllCategories,
    createMarketItem,
    contactSeller,
} from "../controllers/marketController.js";
import { sessionMiddleware } from "../middleware/sessionMiddleware.js";

const router = Router();

router.get("/items", getMarketItems);
router.get("/categories", getAllCategories);
router.post("/items", sessionMiddleware, createMarketItem);
router.post("/contact-seller", sessionMiddleware, contactSeller);

export default router;
