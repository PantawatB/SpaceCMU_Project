import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter (optional but recommended)
const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new Error("Only images are allowed"), false);
    }
};

export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Multiple files upload (for posts with multiple media)
export const uploadMultiple = multer({
    storage: storage,
    limits: {
        fileSize: 200 * 1024 * 1024, // 200 MB per file (covers large videos)
        files: 15,                    // max 15 files in one request
    },
    fileFilter: (req, file, cb) => {
        // Check if it's an image
        const isImage = file.mimetype.startsWith('image/');
        
        // Check if it's a video - support common video formats
        const isVideo = file.mimetype.startsWith('video/') || 
                       file.mimetype === 'application/octet-stream'; // Some .mov files use this mimetype
        
        // Check file extension
        const allowedExtensions = /\.(jpg|jpeg|png|gif|webp|bmp|svg|avif|heic|heif|tiff|mp4|mov|avi|mkv|webm|flv|wmv|m4v|3gp|ts|ogv)$/i;
        const hasValidExtension = allowedExtensions.test(file.originalname);

        if ((isImage || isVideo) && hasValidExtension) {
            return cb(null, true);
        } else if (isImage) {
            // Accept any image mimetype even if extension is unknown
            return cb(null, true);
        } else {
            cb(new Error(`File type not supported: ${file.mimetype}. Only images and videos are allowed!`));
        }
    }
});
