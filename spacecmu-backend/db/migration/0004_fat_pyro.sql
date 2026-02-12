CREATE TABLE "comment_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comment_id" uuid NOT NULL,
	"media_url" varchar(500) NOT NULL,
	"media_type" varchar(20) NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"file_size" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "market_items" ADD COLUMN "image_urls" text;--> statement-breakpoint
ALTER TABLE "comment_media" ADD CONSTRAINT "comment_media_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;