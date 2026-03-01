-- Add parentCommentId to comments for reply support
ALTER TABLE "comments"
  ADD COLUMN IF NOT EXISTS "parent_comment_id" uuid REFERENCES "comments"("id") ON DELETE CASCADE;
