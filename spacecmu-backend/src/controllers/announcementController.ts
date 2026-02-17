import type { Request, Response } from "express";
import { dbClient } from "../../db/client.js";
import { announcementsTable, usersTable } from "../../db/schema.js";
import { eq, desc, or, and } from "drizzle-orm";

export const getUserAnnouncements = async (req: Request, res: Response) => {
    try {
        const userId = req.session?.activeUserId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const announcements = await dbClient
            .select({
                id: announcementsTable.id,
                content: announcementsTable.content,
                type: announcementsTable.type,
                createdAt: announcementsTable.createdAt,
                authorFirstName: usersTable.firstName,
                authorLastName: usersTable.lastName,
                authorAvatarUrl: usersTable.avatarUrl,
            })
            .from(announcementsTable)
            .leftJoin(usersTable, eq(announcementsTable.authorId, usersTable.id))
            .where(
                or(
                    eq(announcementsTable.type, "global"),
                    and(
                        eq(announcementsTable.type, "private"),
                        eq(announcementsTable.targetUserId, userId)
                    )
                )
            )
            .orderBy(desc(announcementsTable.createdAt));

        res.json(announcements);
    } catch (error) {
        console.error("Error fetching announcements:", error);
        res.status(500).json({ message: "Error fetching announcements" });
    }
};
