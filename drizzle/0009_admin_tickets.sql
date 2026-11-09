CREATE TABLE "email_templates" (
	"key" text PRIMARY KEY NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"name" text,
	"added_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_messages" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"ticket_id" text NOT NULL,
	"kind" text NOT NULL,
	"body" text NOT NULL,
	"author_id" text,
	"author_name" text,
	"email_status" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE SEQUENCE IF NOT EXISTS "feedback_number_seq" START WITH 1001;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "number" integer DEFAULT nextval('feedback_number_seq') NOT NULL;--> statement-breakpoint
ALTER SEQUENCE "feedback_number_seq" OWNED BY "feedback"."number";--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_feedback_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."feedback"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "staff_email_idx" ON "staff" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "ticket_messages_ticket_idx" ON "ticket_messages" USING btree ("ticket_id","created_at");--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_number_unique" UNIQUE("number");--> statement-breakpoint
INSERT INTO "ticket_messages" ("ticket_id", "kind", "body", "author_name", "created_at")
SELECT "id", 'note', "admin_note", 'KeyStub staff', "updated_at" FROM "feedback" WHERE coalesce(trim("admin_note"), '') <> '';