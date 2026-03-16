import { createClient } from "@supabase/supabase-js";
import path from "path";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Upload a file buffer to Supabase Storage.
 * @param bucket  Supabase bucket name: "avatars" or "uploads"
 * @param file    The multer file object (must use memoryStorage so file.buffer is populated)
 * @returns       The public URL of the uploaded file
 */
export async function uploadToSupabase(
    bucket: "avatars" | "uploads",
    file: Express.Multer.File
): Promise<string> {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || "";
    const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;

    const { error } = await supabase.storage
        .from(bucket)
        .upload(filename, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
        });

    if (error) {
        throw new Error(`Supabase upload failed: ${error.message}`);
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filename);
    return data.publicUrl;
}

/**
 * Delete a file from Supabase Storage given its public URL.
 * Silently ignores errors (e.g., file already deleted or not found).
 */
export async function deleteFromSupabase(publicUrl: string): Promise<void> {
    try {
        // Extract bucket and path from URL
        // Format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<filename>
        const url = new URL(publicUrl);
        const parts = url.pathname.split("/");
        // parts: ["", "storage", "v1", "object", "public", "<bucket>", "<filename>"]
        const bucketIndex = parts.indexOf("public") + 1;
        if (bucketIndex <= 0 || bucketIndex >= parts.length - 1) return;

        const bucket = parts[bucketIndex] as "avatars" | "uploads";
        const filePath = parts.slice(bucketIndex + 1).join("/");

        await supabase.storage.from(bucket).remove([filePath]);
    } catch {
        // Silently ignore
    }
}
