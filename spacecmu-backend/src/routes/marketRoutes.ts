import { Router } from "express";
import {
    getMarketItems,
    getAllCategories,
    createMarketItem,
} from "../controllers/marketController.js";

const router = Router();

router.get("/items", getMarketItems);
router.get("/categories", getAllCategories);
router.post("/items", createMarketItem);

export default router;
