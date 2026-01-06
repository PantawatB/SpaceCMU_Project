CREATE TABLE "market_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "market_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "market_items" ADD COLUMN "category_id" uuid;--> statement-breakpoint
ALTER TABLE "market_items" ADD CONSTRAINT "market_items_category_id_market_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."market_categories"("id") ON DELETE no action ON UPDATE no action;