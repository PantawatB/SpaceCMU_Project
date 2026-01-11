import { createServer } from "http";
import app from "./app.js";
import dotenv from "dotenv";
import { initializeSocket } from "./utils/socketHandler.js";

dotenv.config();

const port = process.env.PORT || 3001;

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.io
const io = initializeSocket(httpServer);
console.log("[socket]: Socket.io initialized");

// Start server
httpServer.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
    console.log(`[socket]: WebSocket server is ready`);
});

export { io };
