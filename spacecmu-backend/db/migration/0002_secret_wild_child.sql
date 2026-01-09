ALTER TABLE "posts" ADD COLUMN "media_url" varchar(512);--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "media_type" varchar(20) DEFAULT 'image';