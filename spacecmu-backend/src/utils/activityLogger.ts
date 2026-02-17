import { dbClient } from "../../db/client.js";
import { activitiesTable } from "../../db/schema.js";
import type { Request } from "express";

export const logActivity = async (
    userId: string,
    action: string,
    details?: string,
    req?: Request
) => {
    try {
        let ipAddress = req?.ip || req?.socket.remoteAddress || null;

        // Handle IP being potentially an array (e.g. x-forwarded-for) though express usually handles this
        if (Array.isArray(ipAddress)) {
            ipAddress = ipAddress[0];
        }

        await dbClient.insert(activitiesTable).values({
            userId,
            action,
            details: details || null,
            ipAddress: ipAddress ? String(ipAddress) : null,
        });
    } catch (error) {
        // Fail silently to not disrupt the main flow
        console.error("Failed to log activity:", error);
    }
};
