"use server";

import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { ImportVerificationError, importExport } from "@/db/import-core";
import { batteryChecks, chargingSessions, costRecords, feedback, fuelEntries, maintenanceRecords, reminders, savedPlaces, user as userTable, userPrefs, vehicles } from "@/db/schema";
import { normalizeDash, normalizeHistory, normalizeReports } from "@/lib/prefs";
import { afterTicketCreated } from "./tickets";
import { laterLowerOdometer, priorOdometer } from "@/lib/calc";
import { fmtDate } from "@/lib/format";
import { makeFmt, toMetric, type Fmt, type UnitPrefs } from "@/lib/units";
import { PLANS } from "@/lib/plans";
import { requireUser } from "./session";

/*
 * Write side of the data layer. Every action:
 *   1. authenticates (requireUser),
 *   2. validates input with zod,
 *   3. scopes every read/write to the user's id (and checks vehicle ownership).
 *
 * Save actions return `{ warnings }` instead of saving when the duplicate / odometer checks fire;
 * the client shows them and re-submits with `acknowledged: true` — same flow as the original app.
 */

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string } | { ok: false; warnings: string[] };

const optNum = z.preprocess((v) => (v === "" || v === null || v === undefined ? null : Number(v)), z.number().finite().min(0).nullable());
const optInt = z.preprocess((v) => (v === "" || v === null || v === undefined ? null : Math.round(Number(v))), z.number().int().min(0).nullable());
const optStr = z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v ?? null), z.string().trim().max(2000).nullable());
const optDate = z.preprocess((v) => (v === "" || v == null ? null : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable());
const reqDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date");
const dollars = z.preprocess((v) => Number(v), z.number().finite().positive("Enter an amount greater than $0").max(10_000_000));
const cents = (n: number | null) => (n == null ? null : Math.round(n * 100));

async function ownedVehicle(userId: string, vehicleId: string) {
  const [v] = await db
    .select({ id: vehicles.id, currentOdometer: vehicles.currentOdometer })
    .from(vehicles)
    .where(and(eq(vehicles.userId, userId), eq(vehicles.id, vehicleId)));
  if (!v) throw new Error("Vehicle not found");
  return v;
}

async function odometerRows(userId: string, vehicleId: string) {
  const scope = (t: typeof fuelEntries | typeof maintenanceRecords | typeof chargingSessions) => and(eq(t.userId, userId), eq(t.vehicleId, vehicleId));
  const [f, m, c] = await Promise.all([
    db.select({ id: fuelEntries.id, date: fuelEntries.date, odometer: fuelEntries.odometer }).from(fuelEntries).where(scope(fuelEntries)),
    db
      .select({ id: maintenanceRecords.id, date: maintenanceRecords.date, odometer: maintenanceRecords.odometer })
      .from(maintenanceRecords)
      .where(scope(maintenanceRecords)),
    db
      .select({ id: chargingSessions.id, date: chargingSessions.date, odometer: chargingSessions.odometer })
      .from(chargingSessions)
      .where(scope(chargingSessions)),
  ]);
  return [...f, ...m, ...c];
}

function odometerWarnings(
  f: Fmt,
  rows: { id: string; date: string; odometer: number | null }[],
  date: string,
  odo: number,
  excludeId: string | null,
  checkLater: boolean,
) {
  const out: string[] = [];
  if (checkLater) {
    const later = laterLowerOdometer(rows, date, odo, excludeId);
    if (later)
      out.push(`You have a record on ${fmtDate(later.date)} with ${f.dist(later.odo)}, which is lower than ${f.dist(odo)} on ${fmtDate(date)}.`);
  }
  const before = priorOdometer(rows, date, excludeId);
  if (before && odo < before.odo)
    out.push(`Your most recent prior reading was ${f.dist(before.odo)} on ${fmtDate(before.date)} — higher than ${f.dist(odo)}.`);
  return out;
}

/** Keep the vehicle's odometer at the highest reading we've seen. */
async function bumpOdometer(userId: string, vehicleId: string, odo: number | null) {
  if (odo == null) return;
  await db
    .update(vehicles)
    .set({ currentOdometer: odo, updatedAt: new Date() })
    .where(
      and(
        eq(vehicles.userId, userId),
        eq(vehicles.id, vehicleId),
        sql`(${vehicles.currentOdometer} is null or ${vehicles.currentOdometer} < ${odo})`,
      ),
    );
}

const today = () => new Date().toISOString().slice(0, 10);

const fmtOf = (u: UnitPrefs) => makeFmt(u);

function fail(e: unknown): ActionResult {
  if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Invalid input" };
  if (e instanceof Error) return { ok: false, error: e.message };
  return { ok: false, error: "Something went wrong" };
}

/* ================================ FUEL ================================ */

const fuelSchema = z.object({
  date: reqDate,
  totalPaid: dollars,
  odometer: optInt,
  litres: optNum,
  pricePerLitre: optNum,
  // Left unset (null) when unknown — e.g. editing a migrated record without choosing a fill type.
  fillType: z.enum(["full", "partial"]).nullish().transform((v) => v ?? null),
  grade: optStr,
  station: optStr,
  notes: optStr,
});

export async function saveFuel(vehicleId: string, id: string | null, input: unknown, acknowledged = false): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await ownedVehicle(user.id, vehicleId);
    const d = fuelSchema.parse(input);
    const m = toMetric(user.units);
    d.odometer = m.dist(d.odometer);
    d.litres = m.vol(d.litres);
    d.pricePerLitre = m.perVol(d.pricePerLitre);
    const totalPaidCents = cents(d.totalPaid)!;

    if (!acknowledged) {
      const warnings: string[] = [];
      if (d.date > today()) warnings.push("This date is in the future.");
      if (d.odometer != null) warnings.push(...odometerWarnings(fmtOf(user.units), await odometerRows(user.id, vehicleId), d.date, d.odometer, id, true));
      const [dup] = await db
        .select({ id: fuelEntries.id })
        .from(fuelEntries)
        .where(
          and(
            eq(fuelEntries.userId, user.id),
            eq(fuelEntries.vehicleId, vehicleId),
            eq(fuelEntries.date, d.date),
            eq(fuelEntries.totalPaidCents, totalPaidCents),
            id ? ne(fuelEntries.id, id) : undefined,
          ),
        );
      if (dup) warnings.push(`There's already a fuel entry on ${fmtDate(d.date)} for ${fmtOf(user.units).money(totalPaidCents)}.`);
      if (warnings.length) return { ok: false, warnings };
    }

    const { totalPaid: _dollars, ...rest } = d;
    void _dollars;
    const values = { ...rest, totalPaidCents };
    let savedId = id;
    if (id) {
      const r = await db
        .update(fuelEntries)
        .set({ ...values, updatedAt: new Date() })
        .where(and(eq(fuelEntries.userId, user.id), eq(fuelEntries.id, id)))
        .returning({ id: fuelEntries.id });
      if (!r.length) return { ok: false, error: "Record not found" };
    } else {
      const [r] = await db.insert(fuelEntries).values({ ...values, userId: user.id, vehicleId }).returning({ id: fuelEntries.id });
      savedId = r.id;
    }
    await bumpOdometer(user.id, vehicleId, d.odometer);
    revalidatePath(`/app/v/${vehicleId}`, "layout");
    return { ok: true, id: savedId! };
  } catch (e) {
    return fail(e);
  }
}

/* ============================= MAINTENANCE ============================= */

const maintSchema = z.object({
  date: reqDate,
  category: optStr,
  description: optStr,
  shop: optStr,
  partsCost: optNum,
  labourCost: optNum,
  taxCost: optNum,
  totalCost: dollars,
  odometer: optInt,
  nextServiceDate: optDate,
  nextServiceOdometer: optInt,
  warrantyInfo: optStr,
  receiptRef: optStr,
  notes: optStr,
});

export async function saveMaintenance(vehicleId: string, id: string | null, input: unknown, acknowledged = false): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await ownedVehicle(user.id, vehicleId);
    const d = maintSchema.parse(input);
    const m = toMetric(user.units);
    d.odometer = m.dist(d.odometer);
    d.nextServiceOdometer = m.dist(d.nextServiceOdometer);
    const totalCostCents = cents(d.totalCost)!;

    if (!acknowledged) {
      const warnings: string[] = [];
      if (d.date > today()) warnings.push("This date is in the future.");
      if (d.odometer != null) warnings.push(...odometerWarnings(fmtOf(user.units), await odometerRows(user.id, vehicleId), d.date, d.odometer, id, false));
      const [dup] = await db
        .select({ id: maintenanceRecords.id })
        .from(maintenanceRecords)
        .where(
          and(
            eq(maintenanceRecords.userId, user.id),
            eq(maintenanceRecords.vehicleId, vehicleId),
            eq(maintenanceRecords.date, d.date),
            eq(maintenanceRecords.totalCostCents, totalCostCents),
            id ? ne(maintenanceRecords.id, id) : undefined,
          ),
        );
      if (dup) warnings.push(`There's already a maintenance entry on ${fmtDate(d.date)} for ${fmtOf(user.units).money(totalCostCents)}.`);
      if (warnings.length) return { ok: false, warnings };
    }

    const values = {
      date: d.date,
      category: d.category,
      description: d.description,
      shop: d.shop,
      partsCents: cents(d.partsCost),
      labourCents: cents(d.labourCost),
      taxCents: cents(d.taxCost),
      totalCostCents,
      odometer: d.odometer,
      nextServiceDate: d.nextServiceDate,
      nextServiceOdometer: d.nextServiceOdometer,
      warrantyInfo: d.warrantyInfo,
      receiptRef: d.receiptRef,
      notes: d.notes,
    };
    let savedId = id;
    if (id) {
      const r = await db
        .update(maintenanceRecords)
        .set({ ...values, updatedAt: new Date() })
        .where(and(eq(maintenanceRecords.userId, user.id), eq(maintenanceRecords.id, id)))
        .returning({ id: maintenanceRecords.id });
      if (!r.length) return { ok: false, error: "Record not found" };
    } else {
      const [r] = await db
        .insert(maintenanceRecords)
        .values({ ...values, userId: user.id, vehicleId })
        .returning({ id: maintenanceRecords.id });
      savedId = r.id;
    }

    // Next-service fields drive an auto-created reminder (one per maintenance record).
    if (d.nextServiceDate || d.nextServiceOdometer != null) {
      const title = `${d.description || d.category || "Service"} — next service`;
      const [existing] = await db
        .select({ id: reminders.id })
        .from(reminders)
        .where(and(eq(reminders.userId, user.id), eq(reminders.sourceType, "maintenance"), eq(reminders.sourceId, savedId!)));
      const rem = { title, type: d.category, dueDate: d.nextServiceDate, dueOdometer: d.nextServiceOdometer };
      if (existing) await db.update(reminders).set({ ...rem, updatedAt: new Date() }).where(eq(reminders.id, existing.id));
      else
        await db.insert(reminders).values({ ...rem, userId: user.id, vehicleId, sourceType: "maintenance", sourceId: savedId! });
    }

    await bumpOdometer(user.id, vehicleId, d.odometer);
    revalidatePath(`/app/v/${vehicleId}`, "layout");
    return { ok: true, id: savedId! };
  } catch (e) {
    return fail(e);
  }
}

/* ============================ RECURRING / OTHER ============================ */

const costSchema = z.object({
  type: z.string().trim().min(1).max(60),
  date: reqDate,
  amount: dollars,
  provider: optStr,
  nextDueDate: optDate,
  notes: optStr,
});

export async function saveCost(vehicleId: string, id: string | null, input: unknown, acknowledged = false): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await ownedVehicle(user.id, vehicleId);
    const d = costSchema.parse(input);
    const amountCents = cents(d.amount)!;

    if (!acknowledged) {
      const warnings: string[] = [];
      if (d.date > today()) warnings.push("This date is in the future.");
      const [dup] = await db
        .select({ id: costRecords.id })
        .from(costRecords)
        .where(
          and(
            eq(costRecords.userId, user.id),
            eq(costRecords.vehicleId, vehicleId),
            eq(costRecords.date, d.date),
            eq(costRecords.amountCents, amountCents),
            eq(costRecords.type, d.type),
            id ? ne(costRecords.id, id) : undefined,
          ),
        );
      if (dup) warnings.push(`There's already a ${d.type} entry on ${fmtDate(d.date)} for ${fmtOf(user.units).money(amountCents)}.`);
      if (warnings.length) return { ok: false, warnings };
    }

    const values = { type: d.type, date: d.date, amountCents, provider: d.provider, nextDueDate: d.nextDueDate, notes: d.notes };
    let savedId = id;
    if (id) {
      const r = await db
        .update(costRecords)
        .set({ ...values, updatedAt: new Date() })
        .where(and(eq(costRecords.userId, user.id), eq(costRecords.id, id)))
        .returning({ id: costRecords.id });
      if (!r.length) return { ok: false, error: "Record not found" };
    } else {
      const [r] = await db.insert(costRecords).values({ ...values, userId: user.id, vehicleId }).returning({ id: costRecords.id });
      savedId = r.id;
    }
    revalidatePath(`/app/v/${vehicleId}`, "layout");
    return { ok: true, id: savedId! };
  } catch (e) {
    return fail(e);
  }
}

/* ============================== DELETE / FLAGS ============================== */

const TABLES = { fuel: fuelEntries, maintenance: maintenanceRecords, cost: costRecords, charge: chargingSessions } as const;
export type RecordKind = keyof typeof TABLES;

export async function deleteRecord(kind: RecordKind, id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const table = TABLES[kind];
    const [r] = await db
      .delete(table)
      .where(and(eq(table.userId, user.id), eq(table.id, id)))
      .returning({ vehicleId: table.vehicleId });
    if (!r) return { ok: false, error: "Record not found" };
    if (kind === "maintenance")
      await db
        .delete(reminders)
        .where(and(eq(reminders.userId, user.id), eq(reminders.sourceType, "maintenance"), eq(reminders.sourceId, id)));
    revalidatePath(`/app/v/${r.vehicleId}`, "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function clearReviewFlag(kind: RecordKind, id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const table = TABLES[kind];
    const [r] = await db
      .update(table)
      .set({ reviewFlag: null, updatedAt: new Date() })
      .where(and(eq(table.userId, user.id), eq(table.id, id)))
      .returning({ vehicleId: table.vehicleId });
    if (!r) return { ok: false, error: "Record not found" };
    revalidatePath(`/app/v/${r.vehicleId}`, "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ================================ REMINDERS ================================ */

const reminderSchema = z
  .object({ title: z.string().trim().min(1, "Give the reminder a title").max(200), type: optStr, dueDate: optDate, dueOdometer: optInt })
  .refine((r) => r.dueDate || r.dueOdometer != null, { message: "Set a due date or a due odometer" });

export async function saveReminder(vehicleId: string, id: string | null, input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await ownedVehicle(user.id, vehicleId);
    const d = reminderSchema.parse(input);
    d.dueOdometer = toMetric(user.units).dist(d.dueOdometer);
    if (id) {
      const r = await db
        .update(reminders)
        .set({ ...d, updatedAt: new Date() })
        .where(and(eq(reminders.userId, user.id), eq(reminders.id, id)))
        .returning({ id: reminders.id });
      if (!r.length) return { ok: false, error: "Reminder not found" };
    } else {
      await db.insert(reminders).values({ ...d, userId: user.id, vehicleId, sourceType: "manual" });
    }
    revalidatePath(`/app/v/${vehicleId}`, "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function completeReminder(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const [r] = await db
      .update(reminders)
      .set({ completedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(reminders.userId, user.id), eq(reminders.id, id)))
      .returning({ vehicleId: reminders.vehicleId });
    if (!r) return { ok: false, error: "Reminder not found" };
    revalidatePath(`/app/v/${r.vehicleId}`, "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteReminder(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const [r] = await db
      .delete(reminders)
      .where(and(eq(reminders.userId, user.id), eq(reminders.id, id)))
      .returning({ vehicleId: reminders.vehicleId });
    if (!r) return { ok: false, error: "Reminder not found" };
    revalidatePath(`/app/v/${r.vehicleId}`, "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ================================= VEHICLES ================================= */

const vehicleSchema = z.object({
  nickname: optStr,
  powertrain: z.enum(["gas", "diesel", "hybrid", "phev", "ev"]).default("gas"),
  batteryKwh: optNum,
  ratedRangeKm: optInt,
  year: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(1900).max(2100).nullable()),
  make: optStr,
  model: optStr,
  trim: optStr,
  vin: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v ?? null), z.string().trim().toUpperCase().max(17).nullable()),
  plate: optStr,
  purchasePrice: optNum,
  purchaseDate: optDate,
  currentOdometer: optInt,
  insuranceProvider: optStr,
  insurancePolicyCost: optNum,
  insuranceRenewalDate: optDate,
  registrationRenewalDate: optDate,
  notes: optStr,
});

export async function saveVehicle(id: string | null, input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const d = vehicleSchema.parse(input);
    const m = toMetric(user.units);
    d.currentOdometer = m.dist(d.currentOdometer);
    d.ratedRangeKm = m.dist(d.ratedRangeKm);
    if (!d.make && !d.model && !d.nickname) return { ok: false, error: "Enter at least a make/model or a nickname." };
    const isPlugIn = d.powertrain === "ev" || d.powertrain === "phev";
    const values = {
      nickname: d.nickname,
      powertrain: d.powertrain,
      batteryKwh: isPlugIn ? d.batteryKwh : null,
      ratedRangeKm: isPlugIn ? d.ratedRangeKm : null,
      year: d.year,
      make: d.make,
      model: d.model,
      trim: d.trim,
      vin: d.vin,
      plate: d.plate,
      purchasePriceCents: cents(d.purchasePrice),
      purchaseDate: d.purchaseDate,
      currentOdometer: d.currentOdometer,
      insuranceProvider: d.insuranceProvider,
      insurancePolicyCostCents: cents(d.insurancePolicyCost),
      insuranceRenewalDate: d.insuranceRenewalDate,
      registrationRenewalDate: d.registrationRenewalDate,
      notes: d.notes,
    };
    if (id) {
      const r = await db
        .update(vehicles)
        .set({ ...values, updatedAt: new Date() })
        .where(and(eq(vehicles.userId, user.id), eq(vehicles.id, id)))
        .returning({ id: vehicles.id });
      if (!r.length) return { ok: false, error: "Vehicle not found" };
      revalidatePath(`/app/v/${id}`, "layout");
      return { ok: true, id };
    }
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(vehicles)
      .where(and(eq(vehicles.userId, user.id), isNull(vehicles.archivedAt)));
    const limit = PLANS[user.effectivePlan].maxVehicles;
    if (Number(count) >= limit)
      return { ok: false, error: `Your ${PLANS[user.effectivePlan].name} plan includes ${limit} vehicles. Upgrade to Pro to add more.` };
    const [r] = await db.insert(vehicles).values({ ...values, userId: user.id }).returning({ id: vehicles.id });
    revalidatePath("/app", "layout");
    return { ok: true, id: r.id };
  } catch (e) {
    return fail(e);
  }
}

export async function setVehicleArchived(id: string, archived: boolean): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!archived) {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(vehicles)
        .where(and(eq(vehicles.userId, user.id), isNull(vehicles.archivedAt)));
      const limit = PLANS[user.effectivePlan].maxVehicles;
      if (Number(count) >= limit)
        return { ok: false, error: `Your ${PLANS[user.effectivePlan].name} plan includes ${limit} active vehicles. Archive another one or upgrade to Pro to restore this one.` };
    }
    await db
      .update(vehicles)
      .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
      .where(and(eq(vehicles.userId, user.id), eq(vehicles.id, id)));
    revalidatePath("/app", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Permanently deletes a vehicle and all its records. The UI requires typing the vehicle name first. */
export async function deleteVehicle(id: string): Promise<void> {
  const user = await requireUser();
  await db.delete(vehicles).where(and(eq(vehicles.userId, user.id), eq(vehicles.id, id)));
  revalidatePath("/app", "layout");
  redirect("/app");
}

/* ================================== IMPORT ================================== */

export async function importLegacyBackup(
  json: string,
  opts: { targetVehicleId?: string; dryRun: boolean },
): Promise<
  | { ok: true; result: Awaited<ReturnType<typeof importExport>> }
  | { ok: false; error: string }
> {
  try {
    const user = await requireUser();
    if (json.length > 5_000_000) return { ok: false, error: "That file is too large (5 MB max)." };
    let raw: unknown;
    try {
      raw = JSON.parse(json);
    } catch {
      return { ok: false, error: "That file isn't valid JSON." };
    }
    if (!raw || typeof raw !== "object" || !("fuel" in raw || "maintenance" in raw || "costs" in raw))
      return { ok: false, error: "That doesn't look like a Santa Fe Tracker backup file." };
    if (!opts.targetVehicleId) {
      const vs = ((raw as { vehicles?: unknown[] }).vehicles?.length ?? 0) + ((raw as { vehicle?: unknown }).vehicle ? 1 : 0);
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(vehicles)
        .where(and(eq(vehicles.userId, user.id), isNull(vehicles.archivedAt)));
      if (Number(count) + vs > PLANS[user.effectivePlan].maxVehicles)
        return { ok: false, error: "Importing this file would go over your plan's vehicle limit. Import into an existing vehicle instead, or upgrade." };
    }
    const result = await importExport(db, user.id, raw as never, {
      source: "in-app restore",
      targetVehicleId: opts.targetVehicleId,
      dryRun: opts.dryRun,
    });
    if (!opts.dryRun) revalidatePath("/app", "layout");
    return { ok: true, result };
  } catch (e) {
    if (e instanceof ImportVerificationError) return { ok: false, error: e.message };
    return { ok: false, error: e instanceof Error ? e.message : "Import failed" };
  }
}

/* ============================== SETTINGS ============================== */

const reminderPrefsSchema = z.object({
  leadDays: z.preprocess((v) => Number(v), z.number().int().min(1, "At least 1 day").max(365, "At most 365 days")),
  leadKm: z.preprocess((v) => Number(v), z.number().int().min(0).max(20000, "That's too far ahead")),
});

/** How far ahead reminders count as "due soon" (and, later, when reminder emails go out). */
export async function saveReminderPrefs(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const d = reminderPrefsSchema.parse(input);
    await db
      .update(userTable)
      .set({ reminderLeadDays: d.leadDays, reminderLeadKm: toMetric(user.units).dist(d.leadKm)!, updatedAt: new Date() })
      .where(eq(userTable.id, user.id));
    revalidatePath("/app", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ================================ EV: CHARGING ================================ */

const pct = z.preprocess((v) => (v === "" || v == null ? null : Math.round(Number(v))), z.number().int().min(0).max(100).nullable());
const chargeSchema = z.object({
  date: reqDate,
  kwh: z.preprocess((v) => Number(v), z.number().finite().positive("Enter the kWh added").max(1000)),
  // Blank cost at home = estimate from the user's electricity rate; 0 = free charging.
  cost: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().finite().min(0).max(100000).nullable()),
  location: z.enum(["home", "work", "public", "fast", "other"]).default("home"),
  network: optStr,
  odometer: optInt,
  startPct: pct,
  endPct: pct,
  minutes: optInt,
  notes: optStr,
});

export async function saveCharge(vehicleId: string, id: string | null, input: unknown, acknowledged = false): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await ownedVehicle(user.id, vehicleId);
    const d = chargeSchema.parse(input);
    d.odometer = toMetric(user.units).dist(d.odometer);
    let costCents: number;
    let costEstimated = false;
    if (d.cost == null) {
      costCents = Math.round(d.kwh * user.homeKwhPrice * 100);
      costEstimated = true;
    } else costCents = Math.round(d.cost * 100);

    if (!acknowledged) {
      const warnings: string[] = [];
      if (d.date > today()) warnings.push("This date is in the future.");
      if (d.startPct != null && d.endPct != null && d.endPct < d.startPct) warnings.push("The battery % at the end is lower than at the start.");
      if (d.odometer != null) warnings.push(...odometerWarnings(fmtOf(user.units), await odometerRows(user.id, vehicleId), d.date, d.odometer, id, true));
      if (warnings.length) return { ok: false, warnings };
    }

    const values = {
      date: d.date,
      kwh: d.kwh,
      costCents,
      costEstimated,
      pricePerKwh: d.kwh > 0 ? costCents / 100 / d.kwh : null,
      location: d.location,
      network: d.network,
      odometer: d.odometer,
      startPct: d.startPct,
      endPct: d.endPct,
      minutes: d.minutes,
      notes: d.notes,
    };
    let savedId = id;
    if (id) {
      const r = await db
        .update(chargingSessions)
        .set({ ...values, updatedAt: new Date() })
        .where(and(eq(chargingSessions.userId, user.id), eq(chargingSessions.id, id)))
        .returning({ id: chargingSessions.id });
      if (!r.length) return { ok: false, error: "Record not found" };
    } else {
      const [r] = await db.insert(chargingSessions).values({ ...values, userId: user.id, vehicleId }).returning({ id: chargingSessions.id });
      savedId = r.id;
    }
    await bumpOdometer(user.id, vehicleId, d.odometer);
    revalidatePath(`/app/v/${vehicleId}`, "layout");
    return { ok: true, id: savedId! };
  } catch (e) {
    return fail(e);
  }
}

/* ============================ EV: BATTERY HEALTH ============================ */

const batterySchema = z
  .object({
    date: reqDate,
    odometer: optInt,
    healthPct: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().min(1).max(110).nullable()),
    rangeAtFullKm: optInt,
    notes: optStr,
  })
  .refine((b) => b.healthPct != null || b.rangeAtFullKm != null, { message: "Enter the battery health %, the range at 100%, or both" });

export async function saveBatteryCheck(vehicleId: string, id: string | null, input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await ownedVehicle(user.id, vehicleId);
    const d = batterySchema.parse(input);
    const m = toMetric(user.units);
    d.odometer = m.dist(d.odometer);
    d.rangeAtFullKm = m.dist(d.rangeAtFullKm);
    if (id) {
      const r = await db
        .update(batteryChecks)
        .set({ ...d, updatedAt: new Date() })
        .where(and(eq(batteryChecks.userId, user.id), eq(batteryChecks.id, id)))
        .returning({ id: batteryChecks.id });
      if (!r.length) return { ok: false, error: "Record not found" };
    } else {
      await db.insert(batteryChecks).values({ ...d, userId: user.id, vehicleId });
    }
    await bumpOdometer(user.id, vehicleId, d.odometer);
    revalidatePath(`/app/v/${vehicleId}`, "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteBatteryCheck(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const [r] = await db
      .delete(batteryChecks)
      .where(and(eq(batteryChecks.userId, user.id), eq(batteryChecks.id, id)))
      .returning({ vehicleId: batteryChecks.vehicleId });
    if (!r) return { ok: false, error: "Record not found" };
    revalidatePath(`/app/v/${r.vehicleId}`, "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ============================ EV: ENERGY SETTINGS ============================ */

const energySchema = z.object({
  homeKwhPrice: z.preprocess((v) => Number(v), z.number().min(0).max(5, "That price per kWh looks too high")),
  compareL100: z.preprocess((v) => Number(v), z.number().positive("Enter the comparison car's fuel economy")),
  compareFuelPrice: z.preprocess((v) => Number(v), z.number().min(0)),
});

/** Home electricity price (for estimating home charging cost) and the gas car to compare against. */
export async function saveEnergyPrefs(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const d = energySchema.parse(input);
    const m = toMetric(user.units);
    const compareL100 = m.econ(d.compareL100);
    const compareFuelPrice = m.perVol(d.compareFuelPrice)!;
    if (!(compareL100 >= 1 && compareL100 <= 40)) return { ok: false, error: "That fuel economy looks off for a car. Check the number and unit." };
    if (compareFuelPrice > 10) return { ok: false, error: "That fuel price looks too high. Check the number and unit." };
    await db
      .update(userTable)
      .set({ homeKwhPrice: d.homeKwhPrice, compareL100, compareFuelPrice, updatedAt: new Date() })
      .where(eq(userTable.id, user.id));
    revalidatePath("/app", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ============================ UNITS & CURRENCY ============================ */

const unitsSchema = z.object({
  distanceUnit: z.enum(["km", "mi"]),
  volumeUnit: z.enum(["L", "gal", "impgal"]),
  economyUnit: z.enum(["l100", "kml", "mpg", "mpgimp"]),
  currency: z.enum(["CAD", "USD", "GBP", "EUR", "AUD", "NZD"]),
});

/**
 * Display / entry units and currency. Stored data is metric, so switching units never changes
 * any record. Currency is a label only: amounts are NOT converted between currencies.
 */
export async function saveUnitPrefs(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const d = unitsSchema.parse(input);
    await db.update(userTable).set({ ...d, updatedAt: new Date() }).where(eq(userTable.id, user.id));
    revalidatePath("/app", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ============================ ONBOARDING ============================ */

/** Records that the welcome tour was finished or skipped, so it isn't shown automatically again. */
export async function completeOnboarding(): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await db
      .update(userTable)
      .set({ onboardedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(userTable.id, user.id), isNull(userTable.onboardedAt)));
    revalidatePath("/app", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ============================ SAVED STATIONS ============================ */

const coord = (min: number, max: number) => z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().min(min).max(max).nullable());
const placeSchema = z.object({
  kind: z.enum(["fuel", "charging"]),
  name: z.string().trim().min(1, "Enter a name").max(120),
  lat: coord(-90, 90).optional(),
  lng: coord(-180, 180).optional(),
});

/** Save (or update the location of) a station / charging network. Names are unique per user, ignoring case. */
export async function savePlace(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const d = placeSchema.parse(input);
    const [existing] = await db
      .select({ id: savedPlaces.id })
      .from(savedPlaces)
      .where(and(eq(savedPlaces.userId, user.id), eq(savedPlaces.kind, d.kind), sql`lower(${savedPlaces.name}) = lower(${d.name})`));
    const loc = d.lat != null && d.lng != null ? { lat: d.lat, lng: d.lng } : {};
    if (existing) {
      await db.update(savedPlaces).set({ ...loc, updatedAt: new Date() }).where(eq(savedPlaces.id, existing.id));
    } else {
      await db.insert(savedPlaces).values({ userId: user.id, kind: d.kind, name: d.name, ...loc });
    }
    revalidatePath("/app", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

const placeUpdateSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(120).optional(),
  lat: coord(-90, 90).optional(),
  lng: coord(-180, 180).optional(),
  clearLocation: z.boolean().optional(),
});

export async function updatePlace(id: string, input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const d = placeUpdateSchema.parse(input);
    const set: Partial<typeof savedPlaces.$inferInsert> = { updatedAt: new Date() };
    if (d.name) set.name = d.name;
    if (d.clearLocation) Object.assign(set, { lat: null, lng: null });
    else if (d.lat != null && d.lng != null) Object.assign(set, { lat: d.lat, lng: d.lng });
    const r = await db
      .update(savedPlaces)
      .set(set)
      .where(and(eq(savedPlaces.userId, user.id), eq(savedPlaces.id, id)))
      .returning({ id: savedPlaces.id });
    if (!r.length) return { ok: false, error: "Not found" };
    revalidatePath("/app", "layout");
    return { ok: true };
  } catch (e) {
    if (e instanceof Error && /saved_places_user_kind_name_idx/.test(e.message)) return { ok: false, error: "You already have a saved place with that name." };
    return fail(e);
  }
}

/** Removes a saved place. Past entries keep their station name. */
export async function deletePlace(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await db.delete(savedPlaces).where(and(eq(savedPlaces.userId, user.id), eq(savedPlaces.id, id)));
    revalidatePath("/app", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ============================ FEEDBACK & CONTACT ============================ */

const clip = (s: string | null | undefined, n: number) => (s ? s.slice(0, n) : null);

const feedbackSchema = z.object({
  kind: z.enum(["bug", "idea", "question", "other"]),
  message: z.string().trim().min(5, "Tell us a little more (at least a few words).").max(5000, "That's a bit long. Please keep it under 5,000 characters."),
  page: z.string().max(300).optional(),
});

/** In-app feedback from a signed-in user. */
export async function submitFeedback(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const d = feedbackSchema.parse(input);
    const ua = (await headers()).get("user-agent");
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(feedback)
      .where(and(eq(feedback.userId, user.id), sql`${feedback.createdAt} > now() - interval '1 hour'`));
    if (count >= 10) return { ok: false, error: "You've sent a lot of feedback in the last hour. Thank you! Please try again a bit later." };
    const [t] = await db
      .insert(feedback)
      .values({ userId: user.id, email: user.email, name: user.name, kind: d.kind, message: d.message, page: clip(d.page, 300), userAgent: clip(ua, 300) })
      .returning({ id: feedback.id, number: feedback.number });
    await afterTicketCreated({ ...t, kind: d.kind, name: user.name, email: user.email, message: d.message, page: d.page, context: `signed in, ${user.effectivePlan} plan` });
    revalidatePath("/app/feedback");
    return { ok: true, id: String(t.number) };
  } catch (e) {
    return fail(e);
  }
}

const contactSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(254),
  topic: z.enum(["support", "billing", "partnership", "press", "other"]),
  message: z.string().trim().min(10, "Tell us a little more (at least a sentence).").max(5000, "Please keep it under 5,000 characters."),
  /** honeypot: real people never see or fill this */
  website: z.string().max(0).optional().or(z.literal("")),
  /** when the form was shown (ms); bots submit instantly */
  t: z.coerce.number(),
});

/** Public contact form (website). Spam-protected; no account needed. */
export async function submitContact(input: unknown): Promise<ActionResult> {
  try {
    const raw = (input ?? {}) as Record<string, unknown>;
    if (raw.website) return { ok: true }; // honeypot filled: pretend it worked, store nothing
    const d = contactSchema.parse(input);
    if (Date.now() - d.t < 3000) return { ok: false, error: "That was quick! Please take a moment and try again." };
    const h = await headers();
    const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
    const { createHash } = await import("node:crypto");
    const ipHash = createHash("sha256").update(`${ip}|${process.env.BETTER_AUTH_SECRET ?? ""}`).digest("hex").slice(0, 32);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(feedback)
      .where(and(eq(feedback.kind, "contact"), sql`(${feedback.email} = ${d.email} or ${feedback.ipHash} = ${ipHash})`, sql`${feedback.createdAt} > now() - interval '15 minutes'`));
    if (count >= 3) return { ok: false, error: "We've received a few messages from you already. We'll reply soon, or email support@keystub.com." };
    const { getSession } = await import("./session");
    const s = await getSession();
    const [t] = await db
      .insert(feedback)
      .values({
        userId: s?.user.id ?? null,
        email: d.email,
        name: d.name,
        kind: "contact",
        topic: d.topic,
        message: d.message,
        userAgent: clip(h.get("user-agent"), 300),
        ipHash,
      })
      .returning({ id: feedback.id, number: feedback.number });
    await afterTicketCreated({ ...t, kind: "contact", name: d.name, email: d.email, message: d.message, topic: d.topic, context: s ? "has an account, signed in" : null });
    return { ok: true, id: String(t.number) };
  } catch (e) {
    return fail(e);
  }
}

/* ============================ LAYOUT & REPORT PREFS ============================ */

/** Save home-screen layout, report options or maintenance-history columns. null resets to defaults. */
export async function savePrefs(section: "dashboard" | "reports" | "history", value: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const clean = value == null ? null : section === "dashboard" ? normalizeDash(value) : section === "reports" ? normalizeReports(value) : normalizeHistory(value);
    await db
      .insert(userPrefs)
      .values({ userId: user.id, [section]: clean, updatedAt: new Date() })
      .onConflictDoUpdate({ target: userPrefs.userId, set: { [section]: clean, updatedAt: new Date() } });
    revalidatePath("/app", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
