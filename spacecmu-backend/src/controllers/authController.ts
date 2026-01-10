import { type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import axios from "axios";
import { dbClient } from "../../db/client.js";
import { usersTable, sessionsTable } from "../../db/schema.js";
import { eq } from "drizzle-orm";

const CMU_ENTRAID_TOKEN_URL = "https://login.microsoftonline.com/cf81f1df-de59-4c29-91da-a2dfd04aa751/oauth2/v2.0/token";
const CMU_BASIC_INFO_URL = "https://api.cmu.ac.th/mis/cmuaccount/prod/v3/me/basicinfo";

// Login: Redirects to CMU EntraID
export const login = (req: Request, res: Response) => {
    const clientId = process.env.CMU_ENTRAID_CLIENT_ID;
    const redirectUri = process.env.CMU_ENTRAID_REDIRECT_URI;

    // Scopes from the example
    const scope = "api://cmu/Mis.Account.Read.Me.Basicinfo offline_access";

    if (!clientId || !redirectUri) {
        console.error("Missing env vars in login:", {
            hasClientId: !!clientId,
            hasRedirectUri: !!redirectUri,
            env: process.env.NODE_ENV
        });
        return res.status(500).json({ error: "Server configuration error" });
    }

    const authUrl = `https://login.microsoftonline.com/cf81f1df-de59-4c29-91da-a2dfd04aa751/oauth2/v2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;

    res.redirect(authUrl);
};

// Callback: Exchanges code and sets cookie
export const callback = async (req: Request, res: Response) => {
    try {
        const { code } = req.query;

        if (!code) {
            return res.status(400).json({ error: "Code is required" });
        }

        const clientId = process.env.CMU_ENTRAID_CLIENT_ID;
        const clientSecret = process.env.CMU_ENTRAID_CLIENT_SECRET;
        const redirectUri = process.env.CMU_ENTRAID_REDIRECT_URI;

        if (!clientId || !clientSecret || !redirectUri) {
            console.error("Server configuration error: Missing env variables");
            return res.status(500).json({ error: "Server configuration error" });
        }

        // 1. Exchange code for access token
        console.log("Exchanging code for token...");

        const params = new URLSearchParams();
        params.append('client_id', clientId);
        params.append('client_secret', clientSecret);
        params.append('grant_type', 'authorization_code');
        params.append('code', code as string);
        params.append('redirect_uri', redirectUri);

        let tokenResponse;
        try {
            tokenResponse = await axios.post(CMU_ENTRAID_TOKEN_URL, params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
        } catch (error: any) {
            console.error("Token exchange failed:", error.response?.data || error.message);
            return res.status(401).send(`Authentication failed: ${error.message}`);
        }

        const accessToken = tokenResponse.data.access_token;
        console.log("Token received");

        // 2. Fetch user basic info
        console.log("Fetching user info...");
        let infoResponse;
        try {
            infoResponse = await axios.get(CMU_BASIC_INFO_URL, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });
        } catch (error: any) {
            console.error("Failed to fetch user info:", error.response?.data || error.message);
            return res.status(401).send("Failed to fetch user info");
        }

        const userData = infoResponse.data;

        // 3. Upsert User into Database
        console.log("Saving user to database...");
        let user;
        try {
            const email = userData.cmuitaccount + "@cmu.ac.th"; // Construct email if not provided directly, or use cmuitaccount_name
            // Note: CMU Basic Info might vary, usually cmuitaccount_name is the email prefix or full email.
            // We'll use cmuitaccount_name as username and construct email.

            const cmuAccount = userData.cmuitaccount_name || userData.itaccount_name;
            const studentId = userData.student_id || userData.personal_id;

            const [upsertedUser] = await dbClient.insert(usersTable).values({
                firstName: userData.firstname_TH,
                lastName: userData.lastname_TH,
                email: cmuAccount + "@cmu.ac.th", // Assuming cmuitaccount_name is the handle
                username: cmuAccount,
                studentId: studentId,
                faculty: userData.organization_name_TH,
                role: "user",
                status: "active",
                // Generate a consistent avatar URL based on student ID or name
                avatarUrl: `https://ui-avatars.com/api/?name=${userData.firstname_TH}+${userData.lastname_TH}&background=random`,
            }).onConflictDoUpdate({
                target: usersTable.email,
                set: {
                    firstName: userData.firstname_TH,
                    lastName: userData.lastname_TH,
                    studentId: studentId,
                    faculty: userData.organization_name_TH,
                    lastActiveAt: new Date(),
                }
            }).returning();

            user = upsertedUser;
            console.log("User saved:", user.id);

            // 3.1 Handle Anonymous Account (Backend Only)
            const anonEmail = cmuAccount + "@anonymous.spacecmu.com";

            // Check if anonymous account exists
            const existingAnon = await dbClient
                .select()
                .from(usersTable)
                .where(eq(usersTable.email, anonEmail))
                .limit(1);

            if (existingAnon.length === 0) {
                console.log("Creating Anonymous account for user...");
                await dbClient.insert(usersTable).values({
                    firstName: "Anonymous",
                    lastName: "User",
                    email: anonEmail,
                    username: "noobcat_" + cmuAccount,
                    isAnonymous: true,
                    parentUserId: user.id,
                    avatarUrl: "/noobcat.png", // Default anonymous avatar
                    role: "user",
                    status: "active",
                });
                console.log("Anonymous account created.");
            }

        } catch (dbError) {
            console.error("Database save failed:", dbError);
            return res.status(500).send("Failed to save user data");
        }

        // 4. Create session JWT
        const jwtSecret = process.env.JWT_SECRET || "fallback_secret";
        const sessionToken = jwt.sign(
            {
                // Use the database ID and actual role
                id: user.id,
                role: user.role,
                username: user.username,
                email: user.email,

                // Keep original CMU fields for reference if needed
                itaccount_name: userData.cmuitaccount_name || userData.itaccount_name,
                prename_TH: userData.prename_TH,
                firstname_TH: userData.firstname_TH,
                lastname_TH: userData.lastname_TH,
                organization_name_TH: userData.organization_name_TH,
            },
            jwtSecret,
            { expiresIn: "1d" }
        );

        // 4. Set Cookie and Redirect to Frontend
        res.cookie("token", sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 24 * 60 * 60 * 1000, // 1 day
        });

        // 5. Record Login Session
        try {
            const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || req.ip;
            const userAgent = req.headers['user-agent'];

            await dbClient.insert(sessionsTable).values({
                userId: user.id,
                token: sessionToken,
                ipAddress: typeof ipAddress === 'string' ? ipAddress : JSON.stringify(ipAddress),
                userAgent: userAgent as string,
            });
            console.log("Session recorded for user:", user.id);
        } catch (sessionError) {
            console.error("Failed to record session:", sessionError);
            // We don't block the login if session recording fails, but we log it.
        }

        // Redirect to frontend Feeds page
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        res.redirect(`${frontendUrl}/Feeds`);

    } catch (error: any) {
        console.error("Sign-in error:", error);
        res.status(500).send("Internal server error");
    }
};
