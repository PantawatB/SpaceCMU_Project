import type { Request, Response } from "express";
import { dbClient } from "../../db/client.js";
import { marketItemsTable, marketCategoriesTable, usersTable } from "../../db/schema.js";
import { eq, desc, and } from "drizzle-orm";
import { getUserIdFromRequest } from "../utils/authUtils.js";

// Get all market items with filters
export const getMarketItems = async (req: Request, res: Response) => {
    try {
        const { category, sortBy } = req.query;

        let query = dbClient
            .select({
                id: marketItemsTable.id,
                title: marketItemsTable.title,
                description: marketItemsTable.description,
                price: marketItemsTable.price,
                imageUrl: marketItemsTable.imageUrl,
                status: marketItemsTable.status,
                createdAt: marketItemsTable.createdAt,
                seller: {
                    id: usersTable.id,
                    firstName: usersTable.firstName,
                    lastName: usersTable.lastName,
                    avatarUrl: usersTable.avatarUrl,
                },
                category: {
                    id: marketCategoriesTable.id,
                    name: marketCategoriesTable.name,
                }
            })
            .from(marketItemsTable)
            .innerJoin(usersTable, eq(marketItemsTable.sellerId, usersTable.id))
            .leftJoin(marketCategoriesTable, eq(marketItemsTable.categoryId, marketCategoriesTable.id));

        const filters = [];
        if (category) {
            filters.push(eq(marketCategoriesTable.name, category as string));
        }

        if (filters.length > 0) {
            query = query.where(and(...filters)) as any;
        }

        if (sortBy === "latest") {
            query = query.orderBy(desc(marketItemsTable.createdAt)) as any;
        }

        const items = await query;
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
        const userId = getUserIdFromRequest(req);
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { title, description, price, categoryName, imageUrl } = req.body;

        // Find or fallback to Others
        let categoryId = null;
        if (categoryName) {
            const found = await dbClient
                .select()
                .from(marketCategoriesTable)
                .where(eq(marketCategoriesTable.name, categoryName))
                .limit(1);

            if (found.length > 0) {
                categoryId = found[0].id;
            }
        }

        if (!categoryId) {
            const others = await dbClient
                .select()
                .from(marketCategoriesTable)
                .where(eq(marketCategoriesTable.name, "Others"))
                .limit(1);
            if (others.length > 0) {
                categoryId = others[0].id;
            }
        }

        const [insertedItem] = await dbClient
            .insert(marketItemsTable)
            .values({
                title,
                description,
                price,
                sellerId: userId,
                categoryId,
                imageUrl,
            })
            .returning();

        const fullItem = await dbClient
            .select({
                id: marketItemsTable.id,
                title: marketItemsTable.title,
                description: marketItemsTable.description,
                price: marketItemsTable.price,
                imageUrl: marketItemsTable.imageUrl,
                status: marketItemsTable.status,
                createdAt: marketItemsTable.createdAt,
                seller: {
                    id: usersTable.id,
                    firstName: usersTable.firstName,
                    lastName: usersTable.lastName,
                    avatarUrl: usersTable.avatarUrl,
                },
                category: {
                    id: marketCategoriesTable.id,
                    name: marketCategoriesTable.name,
                }
            })
            .from(marketItemsTable)
            .innerJoin(usersTable, eq(marketItemsTable.sellerId, usersTable.id))
            .leftJoin(marketCategoriesTable, eq(marketItemsTable.categoryId, marketCategoriesTable.id))
            .where(eq(marketItemsTable.id, insertedItem.id));

        res.status(201).json(fullItem[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error creating market item" });
    }
};
