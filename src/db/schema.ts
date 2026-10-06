import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/* =====================================================================================
 * Auth tables (Better Auth core schema). Column names are snake_case in the database;
 * Better Auth addresses them by the camelCase TS keys via the Drizzle adapter.
 * ===================================================================================== */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  // --- app-specific fields (registered as Better Auth additionalFields, not user-editable) ---
  plan: text("plan").notNull().default("free"), // "free" | "pro"
  planStatus: text("plan_status"), // mirrors Stripe subscription status
  planRenewsAt: timestamp("plan_renews_at", { withTimezone: true }),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }), // 30-day Pro trial, set at sign-up
  // How far ahead a reminder counts as "due soon" (user setting on the Account page).
  reminderLeadDays: integer("reminder_lead_days").notNull().default(30),
  reminderLeadKm: integer("reminder_lead_km").notNull().default(500),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

/* =====================================================================================
 * App tables. Every row carries `userId` so each person's garage is private by
 * construction: every query in src/server/* filters on it. Money is integer cents.
 * ===================================================================================== */

const id = () =>
  text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`);
const owner = () =>
  text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" });
const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};
const legacyCols = {
  /** Migrated from the original Canva/Artifact tracker (only date + amount were known). */
  legacy: boolean("legacy").notNull().default(false),
  /** The record's id in the source export — lets re-imports update instead of duplicating. */
  legacyId: text("legacy_id"),
  /** Set when a record needs a human look (e.g. suspected duplicate). Cleared by the user. */
  reviewFlag: text("review_flag"),
};

export const vehicles = pgTable(
  "vehicles",
  {
    id: id(),
    userId: owner(),
    nickname: text("nickname"),
    year: integer("year"),
    make: text("make"),
    model: text("model"),
    trim: text("trim"),
    vin: text("vin"),
    plate: text("plate"),
    purchasePriceCents: integer("purchase_price_cents"),
    purchaseDate: date("purchase_date"),
    currentOdometer: integer("current_odometer"),
    insuranceProvider: text("insurance_provider"),
    insurancePolicyCostCents: integer("insurance_policy_cost_cents"),
    insuranceRenewalDate: date("insurance_renewal_date"),
    registrationRenewalDate: date("registration_renewal_date"),
    notes: text("notes"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    legacyId: text("legacy_id"),
    ...timestamps,
  },
  (t) => [index("vehicles_user_idx").on(t.userId)],
);

const vehicleRef = () =>
  text("vehicle_id")
    .notNull()
    .references(() => vehicles.id, { onDelete: "cascade" });

export const fuelEntries = pgTable(
  "fuel_entries",
  {
    id: id(),
    userId: owner(),
    vehicleId: vehicleRef(),
    date: date("date").notNull(),
    totalPaidCents: integer("total_paid_cents").notNull(),
    odometer: integer("odometer"),
    litres: doublePrecision("litres"),
    pricePerLitre: doublePrecision("price_per_litre"),
    fillType: text("fill_type"), // "full" | "partial" | null (unknown, legacy)
    grade: text("grade"),
    station: text("station"),
    notes: text("notes"),
    ...legacyCols,
    ...timestamps,
  },
  (t) => [index("fuel_user_vehicle_date_idx").on(t.userId, t.vehicleId, t.date)],
);

export const maintenanceRecords = pgTable(
  "maintenance_records",
  {
    id: id(),
    userId: owner(),
    vehicleId: vehicleRef(),
    date: date("date").notNull(),
    category: text("category"),
    description: text("description"),
    shop: text("shop"),
    partsCents: integer("parts_cents"),
    labourCents: integer("labour_cents"),
    taxCents: integer("tax_cents"),
    totalCostCents: integer("total_cost_cents").notNull(),
    odometer: integer("odometer"),
    nextServiceDate: date("next_service_date"),
    nextServiceOdometer: integer("next_service_odometer"),
    warrantyInfo: text("warranty_info"),
    receiptRef: text("receipt_ref"),
    notes: text("notes"),
    ...legacyCols,
    ...timestamps,
  },
  (t) => [index("maint_user_vehicle_date_idx").on(t.userId, t.vehicleId, t.date)],
);

export const costRecords = pgTable(
  "cost_records",
  {
    id: id(),
    userId: owner(),
    vehicleId: vehicleRef(),
    date: date("date").notNull(),
    type: text("type").notNull(), // Insurance | Registration | Parking | ...
    amountCents: integer("amount_cents").notNull(),
    provider: text("provider"),
    nextDueDate: date("next_due_date"),
    notes: text("notes"),
    ...legacyCols,
    ...timestamps,
  },
  (t) => [index("cost_user_vehicle_date_idx").on(t.userId, t.vehicleId, t.date)],
);

export const reminders = pgTable(
  "reminders",
  {
    id: id(),
    userId: owner(),
    vehicleId: vehicleRef(),
    title: text("title").notNull(),
    type: text("type"),
    dueDate: date("due_date"),
    dueOdometer: integer("due_odometer"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    /** "manual" or "maintenance" (auto-created from a record's next-service fields). */
    sourceType: text("source_type").notNull().default("manual"),
    sourceId: text("source_id"),
    lastNotifiedAt: timestamp("last_notified_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("reminders_user_vehicle_idx").on(t.userId, t.vehicleId)],
);

/** Append-only log of imports/restores with before/after counts and totals — the audit trail. */
export const importLog = pgTable("import_log", {
  id: id(),
  userId: owner(),
  source: text("source").notNull(),
  summary: text("summary").notNull(), // JSON: { before, after, expected, matched }
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
