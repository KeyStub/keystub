ALTER TABLE "user" ADD COLUMN "distance_unit" text DEFAULT 'km' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "volume_unit" text DEFAULT 'L' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "economy_unit" text DEFAULT 'l100' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "currency" text DEFAULT 'CAD' NOT NULL;