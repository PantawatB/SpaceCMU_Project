ALTER TYPE "public"."user_role" ADD VALUE 'god';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'official_account';--> statement-breakpoint
CREATE TABLE "event_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"event_title" varchar(255) NOT NULL,
	"event_description" text,
	"event_start_time" timestamp NOT NULL,
	"event_end_time" timestamp,
	"event_type" varchar(50) DEFAULT 'event',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp (3)
);
--> statement-breakpoint
CREATE TABLE "official_account_admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"official_account_id" uuid NOT NULL,
	"admin_user_id" uuid NOT NULL,
	"granted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "official_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"username" varchar(50) NOT NULL,
	"faculty" varchar(100) NOT NULL,
	"owner_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp (3),
	CONSTRAINT "official_accounts_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "official_accounts_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "privacy_settings" SET DEFAULT '{"profileVisible":true,"showEmail":false,"allowMessages":true,"showFriends":true,"showLikedPosts":false}'::jsonb;--> statement-breakpoint
ALTER TABLE "event_posts" ADD CONSTRAINT "event_posts_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_account_admins" ADD CONSTRAINT "official_account_admins_official_account_id_official_accounts_id_fk" FOREIGN KEY ("official_account_id") REFERENCES "public"."official_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_account_admins" ADD CONSTRAINT "official_account_admins_admin_user_id_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_accounts" ADD CONSTRAINT "official_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_accounts" ADD CONSTRAINT "official_accounts_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;