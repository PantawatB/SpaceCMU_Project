-- Add share_count column to posts table
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "share_count" integer DEFAULT 0;
