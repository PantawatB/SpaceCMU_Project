import type { Request, Response } from "express";
import { dbClient } from "../../db/client.js";
import { marketItemsTable, marketCategoriesTable, usersTable, messagesTable, chatRoomsTable, chatRoomMembersTable } from "../../db/schema.js";
import { eq, desc, and, or, lt } from "drizzle-orm";
import { getUserIdFromRequest } from "../utils/authUtils.js";

// Get all market items with filters + cursor-based pagination
export const getMarketItems = async (req: Request, res: Response) => {
    try {
        // Require authentication
        const userId = req.session?.activeUserId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized. Please login to view market items." });
        }

        const { category, cursor, limit: limitParam } = req.query;
        const limit = Math.min(parseInt(limitParam as string) || 20, 50);

        const baseSelect = {
            id: marketItemsTable.id,
            title: marketItemsTable.title,
            description: marketItemsTable.description,
            price: marketItemsTable.price,
            imageUrl: marketItemsTable.imageUrl,
            imageUrls: marketItemsTable.imageUrls,
            status: marketItemsTable.status,
            createdAt: marketItemsTable.createdAt,
            seller: {
                id: usersTable.id,
                firstName: usersTable.firstName,
                lastName: usersTable.lastName,
                avatarUrl: usersTable.avatarUrl,
                role: usersTable.role,
            },
            category: {
                id: marketCategoriesTable.id,
                name: marketCategoriesTable.name,
            }
        };

        const filters: ReturnType<typeof eq>[] = [];

        if (category) {
            filters.push(eq(marketCategoriesTable.name, category as string));
        }

        // Cursor: ISO timestamp of the last item seen — fetch items older than it
        if (cursor) {
            const cursorDate = new Date(cursor as string);
            if (!isNaN(cursorDate.getTime())) {
                filters.push(lt(marketItemsTable.createdAt, cursorDate));
            }
        }

        const query = dbClient
            .select(baseSelect)
            .from(marketItemsTable)
            .innerJoin(usersTable, eq(marketItemsTable.sellerId, usersTable.id))
            .leftJoin(marketCategoriesTable, eq(marketItemsTable.categoryId, marketCategoriesTable.id))
            .where(filters.length > 0 ? and(...filters) : undefined)
            .orderBy(desc(marketItemsTable.createdAt))
            .limit(limit + 1); // fetch one extra to detect hasMore

        const rows = await query;
        const hasMore = rows.length > limit;
        const items = hasMore ? rows.slice(0, limit) : rows;

        const nextCursor = hasMore && items.length > 0
            ? items[items.length - 1].createdAt.toISOString()
            : null;

        res.json({ items, hasMore, nextCursor });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching market items" });
    }
};

// Get all categories
export const getAllCategories = async (req: Request, res: Response) => {
    try {
        // Require authentication
        const userId = req.session?.activeUserId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized. Please login to view categories." });
        }

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
                    role: usersTable.role,
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

        // Log Activity
        await import("../utils/activityLogger.js").then(({ logActivity }) => {
            logActivity(userId, "Created market item", `Created item: ${title}`, req);
        });
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
        const files = (req as any).files as Express.Multer.File[];

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

        // Get image URLs if files were uploaded (store first image in imageUrl for backward compatibility)
        const imageUrl = files && files.length > 0 ? `/uploads/${files[0].filename}` : null;
        // Store all image URLs as JSON string
        const imageUrls = files && files.length > 0
            ? JSON.stringify(files.map(f => `/uploads/${f.filename}`))
            : null;

        const [insertedItem] = await dbClient
            .insert(marketItemsTable)
            .values({
                title,
                description,
                price: price.toString(),
                sellerId: userId,
                categoryId,
                imageUrl, // First image for backward compatibility
                imageUrls, // Array of all images as JSON string
            })
            .returning();

        const fullItem = await dbClient
            .select({
                id: marketItemsTable.id,
                title: marketItemsTable.title,
                description: marketItemsTable.description,
                price: marketItemsTable.price,
                imageUrl: marketItemsTable.imageUrl,
                imageUrls: marketItemsTable.imageUrls,
                status: marketItemsTable.status,
                createdAt: marketItemsTable.createdAt,
                seller: {
                    id: usersTable.id,
                    firstName: usersTable.firstName,
                    lastName: usersTable.lastName,
                    avatarUrl: usersTable.avatarUrl,
                    role: usersTable.role,
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

        // Log Activity
        await import("../utils/activityLogger.js").then(({ logActivity }) => {
            logActivity(userId, "Created market item", `Created item: ${title}`, req);
        });
    } catch (error) {
        console.error('Error creating market item:', error);
        res.status(500).json({ message: "Error creating market item", error: error instanceof Error ? error.message : 'Unknown error' });
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

        // Find or create a direct chat room between buyer and seller
        const existingRoom = await dbClient
            .select({ id: chatRoomsTable.id })
            .from(chatRoomsTable)
            .innerJoin(chatRoomMembersTable, eq(chatRoomsTable.id, chatRoomMembersTable.roomId))
            .where(
                and(
                    eq(chatRoomsTable.isGroup, false),
                    eq(chatRoomMembersTable.userId, buyerId)
                )
            )
            .then(async (rooms) => {
                // Check if any of these rooms also has the seller
                for (const room of rooms) {
                    const members = await dbClient
                        .select({ userId: chatRoomMembersTable.userId })
                        .from(chatRoomMembersTable)
                        .where(eq(chatRoomMembersTable.roomId, room.id));

                    const memberIds = members.map(m => m.userId);
                    if (memberIds.includes(marketItem.sellerId) && memberIds.length === 2) {
                        return room;
                    }
                }
                return null;
            });

        let roomId: string;

        if (existingRoom) {
            roomId = existingRoom.id;
        } else {
            // Create new direct room
            const [newRoom] = await dbClient
                .insert(chatRoomsTable)
                .values({
                    isGroup: false,
                    createdBy: buyerId,
                })
                .returning();

            roomId = newRoom.id;

            // Add both users as members
            await dbClient.insert(chatRoomMembersTable).values([
                { roomId, userId: buyerId, role: "member" },
                { roomId, userId: marketItem.sellerId, role: "member" },
            ]);
        }

        // Send message to the room
        const newMessage = await dbClient
            .insert(messagesTable)
            .values({
                roomId,
                senderId: buyerId,
                content: autoMessage
            })
            .returning();

        res.status(201).json({
            success: true,
            message: "Message sent to seller successfully",
            data: {
                messageId: newMessage[0].id,
                roomId,
                sellerId: marketItem.sellerId,
                sellerName: `${marketItem.seller.firstName} ${marketItem.seller.lastName}`,
                itemTitle: marketItem.title,
                sentMessage: newMessage[0]
            }
        });

        // Log Activity
        await import("../utils/activityLogger.js").then(({ logActivity }) => {
            logActivity(buyerId, "Contacted seller", `Contacted seller for item: ${marketItem.title}`, req);
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error contacting seller" });
    }
};

// Get a single market item by ID
export const getMarketItemById = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { itemId } = req.params;

        const items = await dbClient
            .select({
                id: marketItemsTable.id,
                title: marketItemsTable.title,
                description: marketItemsTable.description,
                price: marketItemsTable.price,
                imageUrl: marketItemsTable.imageUrl,
                imageUrls: marketItemsTable.imageUrls,
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
            .where(eq(marketItemsTable.id, itemId))
            .limit(1);

        if (items.length === 0) {
            // Return 200 with status "deleted" instead of 404
            // so browser does not log a network error (expected outcome for chat cards)
            return res.status(200).json({ status: "deleted" });
        }

        res.json(items[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching market item" });
    }
};

// Get market items listed by the current user
export const getMyMarketItems = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const items = await dbClient
            .select({
                id: marketItemsTable.id,
                title: marketItemsTable.title,
                description: marketItemsTable.description,
                price: marketItemsTable.price,
                imageUrl: marketItemsTable.imageUrl,
                imageUrls: marketItemsTable.imageUrls,
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
            .where(eq(marketItemsTable.sellerId, userId))
            .orderBy(desc(marketItemsTable.createdAt));

        res.json(items);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching your market items" });
    }
};

// Get market items by user ID
export const getMarketItemsByUserId = async (req: Request, res: Response) => {
    try {
        // Require authentication
        const currentUserId = req.session?.activeUserId;
        if (!currentUserId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { userId } = req.params;

        const items = await dbClient
            .select({
                id: marketItemsTable.id,
                title: marketItemsTable.title,
                description: marketItemsTable.description,
                price: marketItemsTable.price,
                imageUrl: marketItemsTable.imageUrl,
                imageUrls: marketItemsTable.imageUrls,
                status: marketItemsTable.status,
                createdAt: marketItemsTable.createdAt,
                seller: {
                    id: usersTable.id,
                    firstName: usersTable.firstName,
                    lastName: usersTable.lastName,
                    avatarUrl: usersTable.avatarUrl,
                    role: usersTable.role,
                },
                category: {
                    id: marketCategoriesTable.id,
                    name: marketCategoriesTable.name,
                }
            })
            .from(marketItemsTable)
            .innerJoin(usersTable, eq(marketItemsTable.sellerId, usersTable.id))
            .leftJoin(marketCategoriesTable, eq(marketItemsTable.categoryId, marketCategoriesTable.id))
            .where(eq(marketItemsTable.sellerId, userId))
            .orderBy(desc(marketItemsTable.createdAt));

        res.json(items);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching market items by user" });
    }
};

// Delete a market item (owner only)
export const deleteMarketItem = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        const { itemId } = req.params;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Check ownership
        const item = await dbClient
            .select()
            .from(marketItemsTable)
            .where(eq(marketItemsTable.id, itemId))
            .limit(1);

        if (item.length === 0) {
            return res.status(404).json({ message: "Market item not found" });
        }

        if (item[0].sellerId !== userId) {
            return res.status(403).json({ message: "You are not authorized to delete this item" });
        }

        await dbClient
            .delete(marketItemsTable)
            .where(eq(marketItemsTable.id, itemId));

        res.json({ message: "Market item deleted successfully" });

        // Log Activity
        await import("../utils/activityLogger.js").then(({ logActivity }) => {
            logActivity(userId, "Deleted market item", `Deleted item: ${item[0].title}`, req);
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error deleting market item" });
    }
};

// Update market item status
export const updateMarketItemStatus = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        const { itemId } = req.params;
        const { status } = req.body;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (!status || !["available", "sold"].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        // Check if item exists and user is seller
        const item = await dbClient
            .select()
            .from(marketItemsTable)
            .where(eq(marketItemsTable.id, itemId))
            .limit(1);

        if (item.length === 0) {
            return res.status(404).json({ message: "Market item not found" });
        }

        if (item[0].sellerId !== userId) {
            return res.status(403).json({ message: "You are not authorized to update this item's status" });
        }

        // Update status
        const updatedItem = await dbClient
            .update(marketItemsTable)
            .set({ status })
            .where(eq(marketItemsTable.id, itemId))
            .returning();

        res.json({ message: "Market item status updated successfully", item: updatedItem[0] });

        // Log Activity
        await import("../utils/activityLogger.js").then(({ logActivity }) => {
            logActivity(userId, "Updated market item status", `Updated status to ${status} for item: ${item[0].title}`, req);
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error updating market item status" });
    }
};
