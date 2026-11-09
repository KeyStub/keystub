import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  doublePrecision,
  index,
  uniqueIndex,
  integer,
  jsonb,
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
  // EV settings: home electricity price, and the gas car to compare against.
  homeKwhPrice: doublePrecision("home_kwh_price").notNull().default(0.18), // $ per kWh
  compareL100: doublePrecision("compare_l100").notNull().default(9), // L/100 km of a comparable gas vehicle
  compareFuelPrice: doublePrecision("compare_fuel_price").notNull().default(1.6), // $ per litre
  // Display / entry units and currency. Data is always stored metric; money is in this currency.
  distanceUnit: text("distance_unit").notNull().default("km"), // "km" | "mi"
  volumeUnit: text("volume_unit").notNull().default("L"), // "L" | "gal" (US) | "impgal"
  economyUnit: text("economy_unit").notNull().default("l100"), // "l100" | "kml" | "mpg" | "mpgimp"
  currency: text("currency").notNull().default("CAD"), // ISO 4217
  /** Two-factor sign-in (authenticator app) is on. Managed by Better Auth's twoFactor plugin. */
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  /** When the user finished or skipped the welcome tour; null = show it on next visit. */
  onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
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

/** Authenticator-app secret and hashed backup codes (Better Auth twoFactor plugin; secrets are encrypted). */
export const twoFactor = pgTable(
  "two_factor",
  {
    id: text("id").primaryKey(),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    verified: boolean("verified").default(true),
    failedVerificationCount: integer("failed_verification_count").default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
  },
  (t) => [index("two_factor_user_idx").on(t.userId), index("two_factor_secret_idx").on(t.secret)],
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
    /** "gas" | "diesel" | "hybrid" | "phev" (plug-in hybrid) | "ev" (battery electric). */
    powertrain: text("powertrain").notNull().default("gas"),
    batteryKwh: doublePrecision("battery_kwh"), // usable capacity, EV/PHEV
    ratedRangeKm: integer("rated_range_km"), // official range when new, EV/PHEV
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

export const chargingSessions = pgTable(
  "charging_sessions",
  {
    id: id(),
    userId: owner(),
    vehicleId: vehicleRef(),
    date: date("date").notNull(),
    kwh: doublePrecision("kwh").notNull(), // energy added, as measured by the charger
    costCents: integer("cost_cents").notNull(), // 0 for free charging
    /** true when the cost was worked out from kWh x the user's home rate */
    costEstimated: boolean("cost_estimated").notNull().default(false),
    pricePerKwh: doublePrecision("price_per_kwh"),
    /** "home" | "work" | "public" (Level 2) | "fast" (DC fast) | "other" */
    location: text("location").notNull().default("home"),
    network: text("network"), // e.g. a charging network or station name
    odometer: integer("odometer"),
    startPct: integer("start_pct"),
    endPct: integer("end_pct"),
    minutes: integer("minutes"),
    notes: text("notes"),
    ...legacyCols,
    ...timestamps,
  },
  (t) => [index("charge_user_vehicle_date_idx").on(t.userId, t.vehicleId, t.date)],
);

export const batteryChecks = pgTable(
  "battery_checks",
  {
    id: id(),
    userId: owner(),
    vehicleId: vehicleRef(),
    date: date("date").notNull(),
    odometer: integer("odometer"),
    healthPct: doublePrecision("health_pct"), // state of health, if the car or an app reports it
    rangeAtFullKm: integer("range_at_full_km"), // estimated range shown at 100%
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("battery_user_vehicle_date_idx").on(t.userId, t.vehicleId, t.date)],
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

/** A user's saved fill-up stations ("fuel") and charging networks/spots ("charging"). */
export const savedPlaces = pgTable(
  "saved_places",
  {
    id: id(),
    userId: owner(),
    kind: text("kind").notNull(), // "fuel" | "charging"
    name: text("name").notNull(),
    /** optional: where the place is, so the app can tell when you're there */
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    ...timestamps,
  },
  (t) => [uniqueIndex("saved_places_user_kind_name_idx").on(t.userId, t.kind, sql`lower(${t.name})`)],
);

/** Feedback from the app (bugs, ideas, questions) and messages from the website contact form. */
export const feedback = pgTable(
  "feedback",
  {
    id: id(),
    /** support ticket number, shown as #KS1001 (sequence starts at 1001) */
    number: integer("number").notNull().unique().default(sql`nextval('feedback_number_seq')`),
    /** null for contact-form messages from people who aren't signed in */
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    name: text("name"),
    /** "bug" | "idea" | "question" | "other" (app) · "contact" (website form) */
    kind: text("kind").notNull(),
    /** contact form topic, e.g. "support", "billing", "partnership", "press", "other" */
    topic: text("topic"),
    message: text("message").notNull(),
    /** page the person was on when they sent app feedback */
    page: text("page"),
    userAgent: text("user_agent"),
    /** salted hash of the sender's IP, only for rate limiting the public form */
    ipHash: text("ip_hash"),
    /** "new" | "planned" | "in_progress" | "done" | "closed" */
    status: text("status").notNull().default("new"),
    adminNote: text("admin_note"),
    ...timestamps,
  },
  (t) => [index("feedback_status_idx").on(t.status, t.createdAt), index("feedback_user_idx").on(t.userId)],
);

/** Conversation on a support ticket: staff replies (emailed), internal notes, and auto-replies. */
export const ticketMessages = pgTable(
  "ticket_messages",
  {
    id: id(),
    ticketId: text("ticket_id")
      .notNull()
      .references(() => feedback.id, { onDelete: "cascade" }),
    /** "reply" (emailed to the customer) | "note" (staff only) | "auto_reply" | "customer" (their emailed reply) */
    kind: text("kind").notNull(),
    body: text("body").notNull(),
    authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
    authorName: text("author_name"),
    /** for emailed messages: "sent" | "failed"; for customer emails: attachment count note */
    emailStatus: text("email_status"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ticket_messages_ticket_idx").on(t.ticketId, t.createdAt)],
);

/** Editable emails (auto-replies per ticket type). Missing rows fall back to the defaults in src/lib/admin.ts. */
export const emailTemplates = pgTable("email_templates", {
  key: text("key").primaryKey(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** KeyStub staff (admin access). Owners also come from the ADMIN_EMAILS setting. */
export const staff = pgTable(
  "staff",
  {
    id: id(),
    email: text("email").notNull(),
    /** "owner" | "admin" | "support" */
    role: text("role").notNull(),
    name: text("name"),
    /** their personal KeyStub account, which gets free Pro while they're on the team */
    perkEmail: text("perk_email"),
    addedBy: text("added_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("staff_email_idx").on(sql`lower(${t.email})`)],
);

/** Layout and report choices (home-screen cards, report sections, maintenance history columns). */
export const userPrefs = pgTable("user_prefs", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  dashboard: jsonb("dashboard"),
  reports: jsonb("reports"),
  history: jsonb("history"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
