-- Add message_type enum and column to messages table
-- Supports system messages (e.g. "User changed group name")

DO $$ BEGIN
  CREATE TYPE "message_type" AS ENUM ('text', 'system');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "messages"
  ADD COLUMN IF NOT EXISTS "message_type" "message_type" DEFAULT 'text';
