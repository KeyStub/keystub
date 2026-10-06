"use server";

import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { ImportVerificationError, importExport } from "@/db/import-core";
import { costRecords, fuelEntries, maintenanceRecords, reminders, user as userTable, vehicles } from "@/db/schema";
import { laterLowerOdometer, priorOdometer } from "@/lib/calc";
import { fmtDate, money, numFmt } from "@/lib/format";
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
  const scope = (t: typeof fuelEntries | typeof maintenanceRecords) => and(eq(t.userId, userId), eq(t.vehicleId, vehicleId));
  const [f, m] = await Promise.all([
    db.select({ id: fuelEntries.id, date: fuelEntries.date, odometer: fuelEntries.odometer }).from(fuelEntries).where(scope(fuelEntries)),
    db
      .select({ id: maintenanceRecords.id, date: maintenanceRecords.date, odometer: maintenanceRecords.odometer })
      .from(maintenanceRecords)
      .where(scope(maintenanceRecords)),
  ]);
  return [...f, ...m];
}

function odometerWarnings(rows: { id: string; date: string; odometer: number | null }[], date: string, odo: number, excludeId: string | null, checkLater: boolean) {
  const out: string[] = [];
  if (checkLater) {
    const later = laterLowerOdometer(rows, date, odo, excludeId);
    if (later)
      out.push(`You have a record on ${fmtDate(later.date)} with ${numFmt(later.odo)} km, which is lower than ${numFmt(odo)} km on ${fmtDate(date)}.`);
  }
  const before = priorOdometer(rows, date, excludeId);
  if (before && odo < before.odo)
    out.push(`Your most recent prior reading was ${numFmt(before.odo)} km on ${fmtDate(before.date)} — higher than ${numFmt(odo)} km.`);
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
    const totalPaidCents = cents(d.totalPaid)!;

    if (!acknowledged) {
      const warnings: string[] = [];
      if (d.date > today()) warnings.push("This date is in the future.");
      if (d.odometer != null) warnings.push(...odometerWarnings(await odometerRows(user.id, vehicleId), d.date, d.odometer, id, true));
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
      if (dup) warnings.push(`There's already a fuel entry on ${fmtDate(d.date)} for ${money(totalPaidCents)}.`);
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
    const totalCostCents = cents(d.totalCost)!;

    if (!acknowledged) {
      const warnings: string[] = [];
      if (d.date > today()) warnings.push("This date is in the future.");
      if (d.odometer != null) warnings.push(...odometerWarnings(await odometerRows(user.id, vehicleId), d.date, d.odometer, id, false));
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
      if (dup) warnings.push(`There's already a maintenance entry on ${fmtDate(d.date)} for ${money(totalCostCents)}.`);
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
      if (dup) warnings.push(`There's already a ${d.type} entry on ${fmtDate(d.date)} for ${money(amountCents)}.`);
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

const TABLES = { fuel: fuelEntries, maintenance: maintenanceRecords, cost: costRecords } as const;
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
    if (!d.make && !d.model && !d.nickname) return { ok: false, error: "Enter at least a make/model or a nickname." };
    const values = {
      nickname: d.nickname,
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
  leadKm: z.preprocess((v) => Number(v), z.number().int().min(0).max(20000, "At most 20,000 km")),
});

/** How far ahead reminders count as "due soon" (and, later, when reminder emails go out). */
export async function saveReminderPrefs(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const d = reminderPrefsSchema.parse(input);
    await db
      .update(userTable)
      .set({ reminderLeadDays: d.leadDays, reminderLeadKm: d.leadKm, updatedAt: new Date() })
      .where(eq(userTable.id, user.id));
    revalidatePath("/app", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
