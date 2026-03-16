import type { Request, Response } from "express";
import { dbClient } from "../../db/client.js";
import { usersTable } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { uploadToSupabase } from "../utils/supabaseStorage.js";

// Get all user settings
export const getUserSettings = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const [user] = await dbClient
            .select({
                id: usersTable.id,
                firstName: usersTable.firstName,
                lastName: usersTable.lastName,
                username: usersTable.username,
                email: usersTable.email,
                studentId: usersTable.studentId,
                faculty: usersTable.faculty,
                bio: usersTable.bio,
                avatarUrl: usersTable.avatarUrl,
                bannerUrl: usersTable.bannerUrl,
                notificationSettings: usersTable.notificationSettings,
                privacySettings: usersTable.privacySettings,
                theme: usersTable.theme,
                language: usersTable.language,
            })
            .from(usersTable)
            .where(eq(usersTable.id, userId));

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching user settings" });
    }
};

// Update profile (name, bio, faculty)
export const updateProfile = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { firstName, lastName, faculty, bio } = req.body;

        // Get current user to check if they're anonymous
        const [currentUser] = await dbClient
            .select({ isAnonymous: usersTable.isAnonymous })
            .from(usersTable)
            .where(eq(usersTable.id, userId));

        if (!currentUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const updateData: any = {};

        // Only allow name changes for anonymous users
        if (firstName !== undefined || lastName !== undefined) {
            if (!currentUser.isAnonymous) {
                return res.status(403).json({
                    message: "Public users cannot change their name. Only anonymous users can change their display name."
                });
            }
            // Anonymous users can change their names
            if (firstName !== undefined) updateData.firstName = firstName;
            if (lastName !== undefined) updateData.lastName = lastName;
        }

        // Faculty and bio can be updated by anyone
        if (faculty !== undefined) updateData.faculty = faculty;
        if (bio !== undefined) updateData.bio = bio;

        const [updatedUser] = await dbClient
            .update(usersTable)
            .set(updateData)
            .where(eq(usersTable.id, userId))
            .returning({
                id: usersTable.id,
                firstName: usersTable.firstName,
                lastName: usersTable.lastName,
                faculty: usersTable.faculty,
                bio: usersTable.bio,
                isAnonymous: usersTable.isAnonymous,
            });

        res.json({
            message: "Profile updated successfully",
            user: updatedUser,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error updating profile" });
    }
};

// Upload banner image
export const uploadBanner = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const bannerUrl = await uploadToSupabase("uploads", req.file);

        const [updatedUser] = await dbClient
            .update(usersTable)
            .set({ bannerUrl })
            .where(eq(usersTable.id, userId))
            .returning({
                id: usersTable.id,
                bannerUrl: usersTable.bannerUrl,
            });

        res.json({
            message: "Banner uploaded successfully",
            bannerUrl: updatedUser.bannerUrl,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error uploading banner" });
    }
};

// Upload avatar image
export const uploadAvatar = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const avatarUrl = await uploadToSupabase("avatars", req.file);

        const [updatedUser] = await dbClient
            .update(usersTable)
            .set({ avatarUrl })
            .where(eq(usersTable.id, userId))
            .returning({
                id: usersTable.id,
                avatarUrl: usersTable.avatarUrl,
            });

        res.json({
            message: "Avatar uploaded successfully",
            avatarUrl: updatedUser.avatarUrl,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error uploading avatar" });
    }
};

// Update notification preferences
export const updateNotificationPreferences = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { email, push, sms } = req.body;

        // Get current settings
        const [user] = await dbClient
            .select({ notificationSettings: usersTable.notificationSettings })
            .from(usersTable)
            .where(eq(usersTable.id, userId));

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Merge with new settings
        const currentSettings = user.notificationSettings as any || { email: true, push: true, sms: false };
        const newSettings = {
            email: email !== undefined ? email : currentSettings.email,
            push: push !== undefined ? push : currentSettings.push,
            sms: sms !== undefined ? sms : currentSettings.sms,
        };

        const [updatedUser] = await dbClient
            .update(usersTable)
            .set({ notificationSettings: newSettings })
            .where(eq(usersTable.id, userId))
            .returning({
                id: usersTable.id,
                notificationSettings: usersTable.notificationSettings,
            });

        res.json({
            message: "Notification preferences updated successfully",
            notificationSettings: updatedUser.notificationSettings,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error updating notification preferences" });
    }
};

// Update privacy settings
export const updatePrivacySettings = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { profileVisible, showEmail, allowMessages, showFriends, showLikedPosts } = req.body;

        // Get current settings
        const [user] = await dbClient
            .select({ privacySettings: usersTable.privacySettings })
            .from(usersTable)
            .where(eq(usersTable.id, userId));

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Merge with new settings
        const currentSettings = user.privacySettings as any || {
            profileVisible: true,
            showEmail: false,
            allowMessages: true,
            showFriends: true,
            showLikedPosts: false
        };
        const newSettings = {
            profileVisible: profileVisible !== undefined ? profileVisible : currentSettings.profileVisible,
            showEmail: showEmail !== undefined ? showEmail : currentSettings.showEmail,
            allowMessages: allowMessages !== undefined ? allowMessages : currentSettings.allowMessages,
            showFriends: showFriends !== undefined ? showFriends : currentSettings.showFriends,
            showLikedPosts: showLikedPosts !== undefined ? showLikedPosts : currentSettings.showLikedPosts,
        };

        const [updatedUser] = await dbClient
            .update(usersTable)
            .set({ privacySettings: newSettings })
            .where(eq(usersTable.id, userId))
            .returning({
                id: usersTable.id,
                privacySettings: usersTable.privacySettings,
            });

        res.json({
            message: "Privacy settings updated successfully",
            privacySettings: updatedUser.privacySettings,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error updating privacy settings" });
    }
};

// Delete account (soft delete)
export const deleteAccount = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Soft delete by setting status to inactive and clearing session
        await dbClient
            .update(usersTable)
            .set({
                status: "banned", // Use 'banned' as soft delete status
                updatedAt: new Date(),
            })
            .where(eq(usersTable.id, userId));

        // Clear session
        if (req.session) {
            (req.session as any).destroy((err: any) => {
                if (err) {
                    console.error("Error destroying session:", err);
                }
            });
        }

        res.json({
            message: "Account deleted successfully",
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error deleting account" });
    }
};

// Update appearance settings (theme and language)
export const updateAppearanceSettings = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { theme, language } = req.body;

        const updateData: any = {};
        if (theme !== undefined) {
            // Validate theme
            if (!["light", "dark", "auto"].includes(theme)) {
                return res.status(400).json({ message: "Invalid theme. Must be 'light', 'dark', or 'auto'" });
            }
            updateData.theme = theme;
        }
        if (language !== undefined) {
            // Validate language (you can add more languages as needed)
            if (!["en", "th"].includes(language)) {
                return res.status(400).json({ message: "Invalid language. Must be 'en' or 'th'" });
            }
            updateData.language = language;
        }

        const [updatedUser] = await dbClient
            .update(usersTable)
            .set(updateData)
            .where(eq(usersTable.id, userId))
            .returning({
                id: usersTable.id,
                theme: usersTable.theme,
                language: usersTable.language,
            });

        res.json({
            message: "Appearance settings updated successfully",
            settings: {
                theme: updatedUser.theme,
                language: updatedUser.language,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error updating appearance settings" });
    }
};
