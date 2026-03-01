-- Add message column to notifications table for storing announcement text
ALTER TABLE "notifications"
  ADD COLUMN IF NOT EXISTS "message" text;
