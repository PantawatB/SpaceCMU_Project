import type { Request } from "express";
import jwt from "jsonwebtoken";

export const getUserIdFromRequest = (req: Request): string | null => {
    try {
        let token = req.cookies?.token;

        // Also check Authorization header
        const authHeader = req.headers.authorization;
        if (!token && authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        }

        if (!token) {
            return null;
        }

        const jwtSecret = process.env.JWT_SECRET || "fallback_secret";
        const decoded = jwt.verify(token, jwtSecret) as any;

        return decoded.id;
    } catch (error) {
        console.error("error getUserIdFromRequest: ", error);
        return null;
    }
};
