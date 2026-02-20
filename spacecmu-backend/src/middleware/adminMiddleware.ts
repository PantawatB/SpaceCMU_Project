import { type Request, type Response, type NextFunction } from "express";

export const adminMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Check if user exists (sessionMiddleware should have run first)
    if (!req.activeUser) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    // Check role — god also passes admin checks
    if (req.activeUser.role !== "admin" && req.activeUser.role !== "god") {
        return res.status(403).json({ message: "Forbidden: Admin access only" });
    }

    next();
};
