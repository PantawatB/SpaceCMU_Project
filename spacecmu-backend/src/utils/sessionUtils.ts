import { dbClient } from "../../db/client.js";
import { usersTable, sessionsTable } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";

/**
 * Get anonymous account for a given user
 * @param userId - Public user ID
 * @returns Anonymous user object or null
 */
export async function getAnonymousAccount(userId: string) {
    const anonymousAccounts = await dbClient
        .select()
        .from(usersTable)
        .where(
            and(
                eq(usersTable.parentUserId, userId),
                eq(usersTable.isAnonymous, true)
            )
        )
        .limit(1);

    return anonymousAccounts.length > 0 ? anonymousAccounts[0] : null;
}

/**
 * Update session's active user ID
 * @param sessionId - Session ID
 * @param activeUserId - New active user ID (public or anonymous)
 */
export async function updateSessionActiveUser(sessionId: string, activeUserId: string) {
    await dbClient
        .update(sessionsTable)
        .set({ activeUserId })
        .where(eq(sessionsTable.id, sessionId));
}

/**
 * Get active mode from user object
 * @param user - User object
 * @returns "PUBLIC" or "ANONYMOUS"
 */
export function getActiveMode(user: any): "PUBLIC" | "ANONYMOUS" {
    return user.isAnonymous ? "ANONYMOUS" : "PUBLIC";
}

/**
 * Get session by token
 * @param token - JWT token
 * @returns Session object or null
 */
export async function getSessionByToken(token: string) {
    const sessions = await dbClient
        .select()
        .from(sessionsTable)
        .where(eq(sessionsTable.token, token))
        .limit(1);

    return sessions.length > 0 ? sessions[0] : null;
}

/**
 * Get user by ID
 * @param userId - User ID
 * @returns User object or null
 */
export async function getUserById(userId: string) {
    const users = await dbClient
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);

    return users.length > 0 ? users[0] : null;
}
