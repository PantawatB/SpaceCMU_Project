import type { Request, Response } from "express";
import { dbClient } from "../../db/client.js";
import { usersTable } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

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
        const { id } = req.params;
        const deletedUser = await dbClient
            .delete(usersTable)
            .where(eq(usersTable.id, id))
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

// Update user profile (Bio and Avatar)
export const updateProfile = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { bio, removeAvatar } = req.body;
        const file = req.file;

        // Get existing user to check for old avatar
        const existingUser = await dbClient
            .select()
            .from(usersTable)
            .where(eq(usersTable.id, id))
            .limit(1);

        if (existingUser.length === 0) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        const oldAvatarUrl = existingUser[0].avatarUrl;
        const updateData: any = {};

        if (bio !== undefined) updateData.bio = bio;

        const shouldDeleteOldFile = (file || removeAvatar === "true") && oldAvatarUrl && oldAvatarUrl.startsWith("/uploads/");

        if (removeAvatar === "true") {
            updateData.avatarUrl = null;
        } else if (file) {
            updateData.avatarUrl = `/uploads/${file.filename}`;
        }

        if (Object.keys(updateData).length === 0) {
            res.status(400).json({ message: "No data to update" });
            return;
        }

        // Delete old file if necessary
        if (shouldDeleteOldFile && oldAvatarUrl) {
            const oldFilePath = path.join(process.cwd(), oldAvatarUrl);
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
            }
        }

        const updatedUser = await dbClient
            .update(usersTable)
            .set(updateData)
            .where(eq(usersTable.id, id))
            .returning();

        res.json({ message: "Profile updated successfully", user: updatedUser[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error updating profile" });
    }
};
