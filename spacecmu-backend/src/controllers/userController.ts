import type { Request, Response } from "express";
import { dbClient } from "../../db/client.js";
import { usersTable } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { getUserIdFromRequest } from "../utils/authUtils.js";

// Get all users
export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await dbClient.select().from(usersTable);
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching users" });
    }
};

// Get user by ID
export const getUserById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = await dbClient
            .select()
            .from(usersTable)
            .where(eq(usersTable.id, id))
            .limit(1);

        if (user.length === 0) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        res.json(user[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching user" });
    }
};

// Create a user (simplified for demo)
export const createUser = async (req: Request, res: Response) => {
    try {
        const { firstName, lastName, email, username } = req.body;
        const newUser = await dbClient
            .insert(usersTable)
            .values({
                firstName,
                lastName,
                email,
                username,
            })
            .returning();
        res.status(201).json(newUser[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error creating user" });
    }
};

// Delete a user
export const deleteUser = async (req: Request, res: Response) => {
    try {
        const userId = getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const deletedUser = await dbClient
            .delete(usersTable)
            .where(eq(usersTable.id, userId))
            .returning();

        if (deletedUser.length === 0) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        res.json({ message: "User deleted successfully", user: deletedUser[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error deleting user" });
    }
};

// Update Bio
export const updateBio = async (req: Request, res: Response) => {
    try {
        const userId = getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const { bio } = req.body;
        if (bio === undefined) {
            res.status(400).json({ message: "Bio is required" });
            return;
        }

        const updatedUser = await dbClient
            .update(usersTable)
            .set({ bio })
            .where(eq(usersTable.id, userId))
            .returning();

        if (updatedUser.length === 0) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        res.json({ message: "Bio updated successfully", user: updatedUser[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error updating bio" });
    }
};

// Update Avatar (Picture)
export const updateAvatar = async (req: Request, res: Response) => {
    try {
        const userId = getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const file = req.file;
        if (!file) {
            res.status(400).json({ message: "No image file provided" });
            return;
        }

        // Get existing user to check for old avatar
        const existingUser = await dbClient
            .select()
            .from(usersTable)
            .where(eq(usersTable.id, userId))
            .limit(1);

        if (existingUser.length === 0) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        const oldAvatarUrl = existingUser[0].avatarUrl;
        const newAvatarUrl = `/uploads/${file.filename}`;

        // Delete old file if it's a local upload
        if (oldAvatarUrl && oldAvatarUrl.startsWith("/uploads/")) {
            const oldFilePath = path.join(process.cwd(), oldAvatarUrl);
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
            }
        }

        const updatedUser = await dbClient
            .update(usersTable)
            .set({ avatarUrl: newAvatarUrl })
            .where(eq(usersTable.id, userId))
            .returning();

        res.json({ message: "Avatar updated successfully", user: updatedUser[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error updating avatar" });
    }
};

// Delete Avatar (Picture)
export const deleteAvatar = async (req: Request, res: Response) => {
    try {
        const userId = getUserIdFromRequest(req);
        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        // Get existing user to check for old avatar
        const existingUser = await dbClient
            .select()
            .from(usersTable)
            .where(eq(usersTable.id, userId))
            .limit(1);

        if (existingUser.length === 0) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        const oldAvatarUrl = existingUser[0].avatarUrl;

        // Delete file if it's a local upload
        if (oldAvatarUrl && oldAvatarUrl.startsWith("/uploads/")) {
            const oldFilePath = path.join(process.cwd(), oldAvatarUrl);
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
            }
        }

        const updatedUser = await dbClient
            .update(usersTable)
            .set({ avatarUrl: null })
            .where(eq(usersTable.id, userId))
            .returning();

        res.json({ message: "Avatar deleted successfully", user: updatedUser[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error deleting avatar" });
    }
};

// Get current user (from token)
export const getMe = async (req: Request, res: Response) => {
    try {
        const userId = getUserIdFromRequest(req);

        if (!userId) {
            res.status(401).json({ message: "No token provided" });
            return;
        }

        const userRecord = await dbClient
            .select()
            .from(usersTable)
            .where(eq(usersTable.id, userId))
            .limit(1);

        if (userRecord.length === 0) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        const user: any = userRecord[0];

        // Fetch linked Anonymous account
        let anonymousUser = null;
        if (!user.isAnonymous) {
            const anonRecord = await dbClient
                .select()
                .from(usersTable)
                .where(eq(usersTable.parentUserId, user.id))
                .limit(1);

            if (anonRecord.length > 0) {
                anonymousUser = anonRecord[0];
                user.anonymousUserId = anonymousUser.id;
            }
        }

        res.json({
            user: user,
            anonymousUser: anonymousUser
        });
    } catch (error) {
        console.error("error getMe: ", error);
        res.status(401).json({ message: "Invalid or expired token" });
    }
};
