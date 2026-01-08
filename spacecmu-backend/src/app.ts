import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";

// Import routes
import userRoutes from "./routes/userRoutes.js";
import marketRoutes from "./routes/marketRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import friendRoutes from "./routes/friendRoutes.js";
import calendarRoutes from "./routes/calendarRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import authRoutes from "./routes/authRoutes.js";

const app: Express = express();


// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic Route
app.get("/", (req: Request, res: Response) => {
    res.send("SpaceCMU Backend API is running!");
});

// API Routes
app.use("/api/users", userRoutes);
app.use("/api/market", marketRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/messages", messageRoutes);
console.log("Registering /auth routes...");
app.use("/auth", authRoutes);
console.log("Routes registered.");

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({
        message: "Internal Server Error",
        error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
});

export default app;

