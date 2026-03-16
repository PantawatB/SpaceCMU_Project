import type { Request, Response } from "express";
import { dbClient } from "../../db/client.js";
import { reportsTable, usersTable } from "../../db/schema.js";
import { eq, desc, count, sql } from "drizzle-orm";
import { uploadToSupabase } from "../utils/supabaseStorage.js";

// ──────────────────────────────────────────────
// POST /api/reports  — submit a report (any authenticated user)
// ──────────────────────────────────────────────
export const submitReport = async (req: Request, res: Response) => {
    const userId: string | undefined = req.session?.activeUserId ?? req.session?.userId;
    const { name, issue, postId } = req.body;

    if (!issue?.trim()) {
        return res.status(400).json({ message: "issue is required" });
    }

    // Collect uploaded files (field name: "media") and upload to Supabase
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    const mediaUrls: string[] = await Promise.all(
        files.map((f) => uploadToSupabase("uploads", f))
    );

    try {
        const [report] = await dbClient
            .insert(reportsTable)
            .values({
                submitterUserId: userId ?? null,
                name: name?.trim() || null,
                issue: issue.trim(),
                mediaUrls: mediaUrls.length > 0 ? JSON.stringify(mediaUrls) : null,
                postId: postId?.trim() || null,
                status: "open",
            })
            .returning();

        res.status(201).json({ message: "Report submitted successfully", report });
    } catch (error) {
        console.error("submitReport error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// ──────────────────────────────────────────────
// GET /api/god/reports?page=1&limit=20&status=open
// god only — view all reports
// ──────────────────────────────────────────────
export const getReports = async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;
    const statusFilter = (req.query.status as string) || "all";

    try {
        const whereClause =
            statusFilter !== "all"
                ? sql`${reportsTable.status} = ${statusFilter}`
                : undefined;

        const [rows, totalRow] = await Promise.all([
            dbClient
                .select({
                    id: reportsTable.id,
                    name: reportsTable.name,
                    issue: reportsTable.issue,
                    mediaUrls: reportsTable.mediaUrls,
                    postId: reportsTable.postId,
                    status: reportsTable.status,
                    createdAt: reportsTable.createdAt,
                    submitter: {
                        id: usersTable.id,
                        firstName: usersTable.firstName,
                        lastName: usersTable.lastName,
                        username: usersTable.username,
                        email: usersTable.email,
                        avatarUrl: usersTable.avatarUrl,
                        role: usersTable.role,
                    },
                })
                .from(reportsTable)
                .leftJoin(usersTable, eq(reportsTable.submitterUserId, usersTable.id))
                .where(whereClause)
                .orderBy(desc(reportsTable.createdAt))
                .limit(limit)
                .offset(offset),
            dbClient
                .select({ total: count() })
                .from(reportsTable)
                .where(whereClause),
        ]);

        const total = totalRow[0]?.total ?? 0;

        res.json({
            data: rows.map((r) => ({
                ...r,
                mediaUrls: r.mediaUrls ? JSON.parse(r.mediaUrls) : [],
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasMore: offset + limit < total,
            },
        });
    } catch (error) {
        console.error("getReports error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// ──────────────────────────────────────────────
// PATCH /api/god/reports/:id/status — update report status (god only)
// Body: { status: "open" | "resolved" | "dismissed" }
// ──────────────────────────────────────────────
export const updateReportStatus = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ["open", "resolved", "dismissed"];
    if (!allowed.includes(status)) {
        return res.status(400).json({ message: "Invalid status. Allowed: open, resolved, dismissed" });
    }

    try {
        const [updated] = await dbClient
            .update(reportsTable)
            .set({ status })
            .where(eq(reportsTable.id, id))
            .returning({ id: reportsTable.id, status: reportsTable.status });

        if (!updated) return res.status(404).json({ message: "Report not found" });

        res.json({ message: `Report status updated to ${status}`, report: updated });
    } catch (error) {
        console.error("updateReportStatus error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
