import type { Request, Response } from "express";
import { dbClient } from "../../db/client.js";
import { marketItemsTable, marketCategoriesTable } from "../../db/schema.js";
import { eq } from "drizzle-orm";

// Get all market items
export const getAllValuableItems = async (req: Request, res: Response) => {
    try {
        const items = await dbClient.select().from(marketItemsTable);
        res.json(items);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching market items" });
    }
};

// Get all categories
export const getAllCategories = async (req: Request, res: Response) => {
    try {
        const categories = await dbClient.select().from(marketCategoriesTable);
        res.json(categories);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching categories" });
    }
};

// Create a market item
export const createMarketItem = async (req: Request, res: Response) => {
    try {
        const { title, description, price, sellerId, categoryId } = req.body;
        const newItem = await dbClient
            .insert(marketItemsTable)
            .values({
                title,
                description,
                price,
                sellerId,
                categoryId,
            })
            .returning();
        res.status(201).json(newItem[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error creating market item" });
    }
};
