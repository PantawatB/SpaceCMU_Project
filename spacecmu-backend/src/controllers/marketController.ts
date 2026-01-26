import type { Request, Response } from "express";
import { dbClient } from "../../db/client.js";
import { marketItemsTable, marketCategoriesTable, usersTable, messagesTable } from "../../db/schema.js";
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
        const userId = req.session?.activeUserId;
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

// Create a market item with image upload
export const createMarketItemWithImage = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { title, description, price, categoryName } = req.body;
        const file = (req as any).file;

        // Validate required fields
        if (!title || !price) {
            return res.status(400).json({ message: "Title and price are required" });
        }

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

        // Get image URL if file was uploaded
        const imageUrl = file ? `/uploads/${file.filename}` : null;

        const [insertedItem] = await dbClient
            .insert(marketItemsTable)
            .values({
                title,
                description,
                price: price.toString(),
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

// Contact seller - Send message with product info
export const contactSeller = async (req: Request, res: Response) => {
    try {
        const buyerId = req.session?.activeUserId;
        const { itemId, customMessage } = req.body;

        if (!buyerId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Validation
        if (!itemId) {
            return res.status(400).json({ message: "itemId is required" });
        }

        // Get market item details
        const item = await dbClient
            .select({
                id: marketItemsTable.id,
                title: marketItemsTable.title,
                description: marketItemsTable.description,
                price: marketItemsTable.price,
                sellerId: marketItemsTable.sellerId,
                seller: {
                    id: usersTable.id,
                    firstName: usersTable.firstName,
                    lastName: usersTable.lastName,
                }
            })
            .from(marketItemsTable)
            .innerJoin(usersTable, eq(marketItemsTable.sellerId, usersTable.id))
            .where(eq(marketItemsTable.id, itemId))
            .limit(1);

        if (item.length === 0) {
            return res.status(404).json({ message: "Market item not found" });
        }

        const marketItem = item[0];

        // Check if buyer is trying to contact themselves
        if (marketItem.sellerId === buyerId) {
            return res.status(400).json({ message: "You cannot contact yourself" });
        }

        // Create auto-generated message with product info
        const autoMessage = customMessage
            ? `${customMessage}\n\n---\nสินค้าที่สนใจ: ${marketItem.title}\nราคา: ฿${marketItem.price}\nรายละเอียด: ${marketItem.description || "ไม่มีรายละเอียด"}`
            : `สวัสดีครับ/ค่ะ สนใจสินค้าของคุณ\n\nสินค้า: ${marketItem.title}\nราคา: ฿${marketItem.price}\nรายละเอียด: ${marketItem.description || "ไม่มีรายละเอียด"}\n\nสามารถติดต่อได้ไหมครับ/ค่ะ`;

        // Send message
        const newMessage = await dbClient
            .insert(messagesTable)
            .values({
                senderId: buyerId,
                receiverId: marketItem.sellerId,
                content: autoMessage
            })
            .returning();

        res.status(201).json({
            success: true,
            message: "Message sent to seller successfully",
            data: {
                messageId: newMessage[0].id,
                sellerId: marketItem.sellerId,
                sellerName: `${marketItem.seller.firstName} ${marketItem.seller.lastName}`,
                itemTitle: marketItem.title,
                sentMessage: newMessage[0]
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error contacting seller" });
    }
};
