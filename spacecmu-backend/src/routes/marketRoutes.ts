import { Router } from "express";
import {
    getAllValuableItems,
    getAllCategories,
    createMarketItem,
} from "../controllers/marketController.js";

const router = Router();

router.get("/items", getAllValuableItems);
router.get("/categories", getAllCategories);
router.post("/items", createMarketItem);

export default router;
