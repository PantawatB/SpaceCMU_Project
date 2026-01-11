import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getSessionByToken, getUserById } from "../utils/sessionUtils.js";

// Extend Express Request type
export interface SessionData {
    userId: string;        // เจ้าของ account (public)
    activeUserId: string;  // ตัวตนปัจจุบัน (public หรือ anonymous)
    sessionId: string;
}

declare global {
    namespace Express {
        interface Request {
            session?: SessionData;
            activeUser?: any; // User object ของ activeUserId
        }
    }
}

/**
 * Middleware to verify JWT and load session data
 * Attaches session and activeUser to req object
 */
export const sessionMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        // 1. Get token from cookie or Authorization header
        let token = req.cookies?.token;

        const authHeader = req.headers.authorization;
        if (!token && authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({ message: "No token provided" });
        }

        // 2. Verify JWT
        const jwtSecret = process.env.JWT_SECRET || "fallback_secret";
        let decoded: any;

        try {
            decoded = jwt.verify(token, jwtSecret);
        } catch (error) {
            return res.status(401).json({ message: "Invalid token" });
        }

        // 3. Get session from database
        const session = await getSessionByToken(token);

        if (!session) {
            return res.status(401).json({ message: "Session not found" });
        }

        // 4. Get active user
        const activeUser = await getUserById(session.activeUserId);

        if (!activeUser) {
            return res.status(401).json({ message: "Active user not found" });
        }

        // 5. Attach to request
        req.session = {
            userId: session.userId,
            activeUserId: session.activeUserId,
            sessionId: session.id,
        };
        req.activeUser = activeUser;

        next();
    } catch (error) {
        console.error("Session middleware error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
