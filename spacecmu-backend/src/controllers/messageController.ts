import type { Request, Response } from "express";
import { dbClient } from "../../db/client.js";
import { messagesTable } from "../../db/schema.js";
import { eq, or, and } from "drizzle-orm";

export const sendMessage = async (req: Request, res: Response) => {
    try {
        const { senderId, receiverId, content } = req.body;
        const newMessage = await dbClient
            .insert(messagesTable)
            .values({ senderId, receiverId, content })
            .returning();
        res.status(201).json(newMessage[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error sending message" });
    }
};

export const getConversation = async (req: Request, res: Response) => {
    try {
        const { userId1, userId2 } = req.params;
        const messages = await dbClient
            .select()
            .from(messagesTable)
            .where(
                or(
                    and(eq(messagesTable.senderId, userId1), eq(messagesTable.receiverId, userId2)),
                    and(eq(messagesTable.senderId, userId2), eq(messagesTable.receiverId, userId1))
                )
            );
        res.json(messages);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching conversation" });
    }
};
