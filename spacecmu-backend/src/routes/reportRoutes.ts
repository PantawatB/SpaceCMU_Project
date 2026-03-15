import { Router } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { submitReport } from "../controllers/reportController.js";
import { sessionMiddleware } from "../middleware/sessionMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Storage: same uploads/ folder, with "report-" prefix
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, "uploads/"),
    filename: (_req, file, cb) => {
        const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, "report-" + unique + path.extname(file.originalname));
    },
});

const uploadReport = multer({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50 MB per file
        files: 10,
    },
    fileFilter: (_req, file, cb) => {
        const isImage = file.mimetype.startsWith("image/");
        const isVideo = file.mimetype.startsWith("video/");
        const allowedExt = /\.(jpg|jpeg|png|gif|webp|mp4|mov|avi|mkv|webm|m4v)$/i;
        if ((isImage || isVideo) && allowedExt.test(file.originalname)) {
            return cb(null, true);
        }
        if (isImage) return cb(null, true); // accept any image mime
        cb(new Error("Only images and videos are allowed"));
    },
});

// POST /api/reports — any authenticated user can submit
router.use(sessionMiddleware);
router.post(
    "/",
    (req, res, next) => {
        uploadReport.array("media", 10)(req, res, (err) => {
            if (err instanceof multer.MulterError || err instanceof Error) {
                return res.status(400).json({ message: err.message });
            }
            next();
        });
    },
    submitReport
);

export default router;
