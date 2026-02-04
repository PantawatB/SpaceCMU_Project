-- Add unique constraint to reposts table to prevent duplicate reposts
ALTER TABLE "reposts" ADD CONSTRAINT "unique_user_post_repost" UNIQUE("user_id", "post_id");--> statement-breakpoint

-- Add unique constraint to saved_posts table to prevent duplicate saves
ALTER TABLE "saved_posts" ADD CONSTRAINT "unique_user_post_save" UNIQUE("user_id", "post_id");
