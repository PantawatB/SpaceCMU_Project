import { type Request, type Response, type NextFunction } from "express";

export const godMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (!req.activeUser) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.activeUser.role !== "god") {
        return res.status(403).json({ message: "Forbidden: God access only" });
    }

    next();
};
