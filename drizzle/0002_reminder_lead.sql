ALTER TABLE "user" ADD COLUMN "reminder_lead_days" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "reminder_lead_km" integer DEFAULT 500 NOT NULL;