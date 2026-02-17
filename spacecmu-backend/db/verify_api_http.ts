import { dbClient } from "./client.js";
import { usersTable, sessionsTable } from "./schema.js";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import axios from "axios";

async function verifyAdminApi() {
    console.log("--- Verifying Admin API HTTP Endpoint ---");

    try {
        // 1. Get an Admin User
        const [adminUser] = await dbClient
            .select()
            .from(usersTable)
            .where(eq(usersTable.role, "admin"))
            .limit(1);

        if (!adminUser) {
            console.error("No admin user found. Please run 'set_admin.ts' first.");
            process.exit(1);
        }

        console.log(`Found Admin User: ${adminUser.email} (${adminUser.id})`);

        // 2. Generate Token (mimic login)
        // We need to create a session first to pass sessionMiddleware check
        // sessionMiddleware checks: token -> session -> activeUser

        // Create a fake session
        const [newSession] = await dbClient.insert(sessionsTable).values({
            userId: adminUser.id,
            activeUserId: adminUser.id,
            token: "temp_admin_test_token_" + Date.now(),
            ipAddress: "127.0.0.1",
            userAgent: "TestScript"
        }).returning();

        // Sign the token (actually sessionMiddleware verifies jwt first, then looks up session by token string)
        // Wait, sessionMiddleware logic:
        // 1. Verify JWT
        // 2. getSessionByToken(token)

        // So the token stored in DB must match the token sent in header.
        // And the token must be a valid JWT.

        const jwtSecret = process.env.JWT_SECRET || "fallback_secret";
        const validToken = jwt.sign(
            { sessionId: newSession.id, userId: adminUser.id },
            jwtSecret,
            { expiresIn: "1h" }
        );

        // Update the session in DB with the VALID JWT
        await dbClient
            .update(sessionsTable)
            .set({ token: validToken })
            .where(eq(sessionsTable.id, newSession.id));

        console.log("Generated valid session and token.");

        // 3. Call API
        try {
            const response = await axios.get("http://localhost:3001/api/admin/stats", {
                headers: {
                    Authorization: `Bearer ${validToken}`
                }
            });

            console.log("API Response Status:", response.status);
            console.log("API Response Data:", response.data);

            if (response.status === 200 && response.data.totalUsers !== undefined) {
                console.log("✅ Verification SUCCESS: API is working correctly.");
            } else {
                console.error("❌ Verification FAILED: Unexpected response format.");
            }

        } catch (err: any) {
            console.error("❌ API Call Failed:", err.response?.status, err.response?.data || err.message);
        }

        // Cleanup (optional, but good practice)
        await dbClient.delete(sessionsTable).where(eq(sessionsTable.id, newSession.id));

    } catch (error) {
        console.error("Error in verification script:", error);
    } finally {
        process.exit(0);
    }
}

verifyAdminApi();
