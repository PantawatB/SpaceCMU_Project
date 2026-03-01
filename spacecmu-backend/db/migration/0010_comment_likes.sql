-- Add like_count to comments table
ALTER TABLE "comments"
  ADD COLUMN IF NOT EXISTS "like_count" integer NOT NULL DEFAULT 0;

-- Create comment_likes table
CREATE TABLE IF NOT EXISTS "comment_likes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "comment_id" uuid NOT NULL REFERENCES "comments"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "unique_user_comment_like" UNIQUE ("user_id", "comment_id")
);
