import multer from "multer";
import path from "path";

// Use memory storage — files are held in buffer and then streamed to Supabase.
// Never write to local disk (which is ephemeral on Railway).
const memoryStorage = multer.memoryStorage();

// File filter for images only
const imageOnlyFilter = (req: any, file: Express.Multer.File, cb: any) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new Error("Only images are allowed"), false);
    }
};

export const upload = multer({
    storage: memoryStorage,
    fileFilter: imageOnlyFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit for avatars/banners
    }
});

// Multiple files upload (for posts with multiple media)
export const uploadMultiple = multer({
    storage: memoryStorage,
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
