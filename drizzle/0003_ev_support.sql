CREATE TABLE "battery_checks" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text NOT NULL,
	"vehicle_id" text NOT NULL,
	"date" date NOT NULL,
	"odometer" integer,
	"health_pct" double precision,
	"range_at_full_km" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "charging_sessions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"user_id" text NOT NULL,
	"vehicle_id" text NOT NULL,
	"date" date NOT NULL,
	"kwh" double precision NOT NULL,
	"cost_cents" integer NOT NULL,
	"cost_estimated" boolean DEFAULT false NOT NULL,
	"price_per_kwh" double precision,
	"location" text DEFAULT 'home' NOT NULL,
	"network" text,
	"odometer" integer,
	"start_pct" integer,
	"end_pct" integer,
	"minutes" integer,
	"notes" text,
	"legacy" boolean DEFAULT false NOT NULL,
	"legacy_id" text,
	"review_flag" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "home_kwh_price" double precision DEFAULT 0.18 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "compare_l100" double precision DEFAULT 9 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "compare_fuel_price" double precision DEFAULT 1.6 NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "powertrain" text DEFAULT 'gas' NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "battery_kwh" double precision;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "rated_range_km" integer;--> statement-breakpoint
ALTER TABLE "battery_checks" ADD CONSTRAINT "battery_checks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battery_checks" ADD CONSTRAINT "battery_checks_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD CONSTRAINT "charging_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charging_sessions" ADD CONSTRAINT "charging_sessions_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "battery_user_vehicle_date_idx" ON "battery_checks" USING btree ("user_id","vehicle_id","date");--> statement-breakpoint
CREATE INDEX "charge_user_vehicle_date_idx" ON "charging_sessions" USING btree ("user_id","vehicle_id","date");