CREATE TABLE "support_categories" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"name" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "follow_up_of" integer;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "customer_seen_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "support_categories_name_idx" ON "support_categories" USING btree (lower("name"));--> statement-breakpoint
INSERT INTO "support_categories" ("name", "sort") VALUES
  ('Account & sign-in', 1),
  ('Billing & plans', 2),
  ('Vehicles & VIN', 3),
  ('Fuel & charging logs', 4),
  ('Maintenance & reminders', 5),
  ('Reports & exports', 6),
  ('Import & data', 7),
  ('App bug or crash', 8),
  ('Feature request', 9),
  ('Other', 10)
ON CONFLICT DO NOTHING;
