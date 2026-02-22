-- Add media support to messages table
ALTER TABLE "messages"
  ADD COLUMN IF NOT EXISTS "media_urls" text,
  ADD COLUMN IF NOT EXISTS "media_type" varchar(20),
  ALTER COLUMN "content" SET DEFAULT '';
