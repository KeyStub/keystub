import "server-only";
import { and, asc, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { batteryChecks, chargingSessions, costRecords, fuelEntries, maintenanceRecords, reminders, savedPlaces, userPrefs, vehicles } from "@/db/schema";
import { normalizeDash, normalizeHistory, normalizeReports } from "@/lib/prefs";
import { placeKey, sortPlaces, type PlaceKind, type PlaceOption, type PlacesData } from "@/lib/places";

/*
 * Read side of the data layer. Every function takes the userId and filters on it, so a record
 * belonging to someone else is indistinguishable from one that doesn't exist (404, never 403).
 */

export async function listVehicles(userId: string, opts: { includeArchived?: boolean } = {}) {
  return db
    .select()
    .from(vehicles)
    .where(
      opts.includeArchived
        ? eq(vehicles.userId, userId)
        : and(eq(vehicles.userId, userId), isNull(vehicles.archivedAt)),
    )
    .orderBy(asc(vehicles.createdAt));
}

export const getVehicle = cache(async (userId: string, vehicleId: string) => {
  const [v] = await db
    .select()
    .from(vehicles)
    .where(and(eq(vehicles.userId, userId), eq(vehicles.id, vehicleId)));
  if (!v) notFound();
  return v;
});

export const getVehicleBundle = cache(async (userId: string, vehicleId: string) => {
  const vehicle = await getVehicle(userId, vehicleId);
  const [fuel, maintenance, costs, rems, charges, battery] = await Promise.all([
    db
      .select()
      .from(fuelEntries)
      .where(and(eq(fuelEntries.userId, userId), eq(fuelEntries.vehicleId, vehicleId)))
      .orderBy(desc(fuelEntries.date), desc(fuelEntries.createdAt)),
    db
      .select()
      .from(maintenanceRecords)
      .where(and(eq(maintenanceRecords.userId, userId), eq(maintenanceRecords.vehicleId, vehicleId)))
      .orderBy(desc(maintenanceRecords.date), desc(maintenanceRecords.createdAt)),
    db
      .select()
      .from(costRecords)
      .where(and(eq(costRecords.userId, userId), eq(costRecords.vehicleId, vehicleId)))
      .orderBy(desc(costRecords.date), desc(costRecords.createdAt)),
    db
      .select()
      .from(reminders)
      .where(and(eq(reminders.userId, userId), eq(reminders.vehicleId, vehicleId)))
      .orderBy(asc(reminders.dueDate)),
    db
      .select()
      .from(chargingSessions)
      .where(and(eq(chargingSessions.userId, userId), eq(chargingSessions.vehicleId, vehicleId)))
      .orderBy(desc(chargingSessions.date), desc(chargingSessions.createdAt)),
    db
      .select()
      .from(batteryChecks)
      .where(and(eq(batteryChecks.userId, userId), eq(batteryChecks.vehicleId, vehicleId)))
      .orderBy(desc(batteryChecks.date)),
  ]);
  return { vehicle, fuel, maintenance, costs, reminders: rems, charges, battery };
});

export type VehicleBundle = Awaited<ReturnType<typeof getVehicleBundle>>;
export type Vehicle = VehicleBundle["vehicle"];
export type FuelEntry = VehicleBundle["fuel"][number];
export type MaintenanceRecord = VehicleBundle["maintenance"][number];
export type CostRecord = VehicleBundle["costs"][number];
export type Reminder = VehicleBundle["reminders"][number];
export type ChargingSession = VehicleBundle["charges"][number];
export type BatteryCheck = VehicleBundle["battery"][number];

/** Everything the user owns, for "Download all my data". */
export async function exportAllForUser(userId: string) {
  const [vs, fuel, maintenance, costs, rems, charges, battery] = await Promise.all([
    db.select().from(vehicles).where(eq(vehicles.userId, userId)),
    db.select().from(fuelEntries).where(eq(fuelEntries.userId, userId)),
    db.select().from(maintenanceRecords).where(eq(maintenanceRecords.userId, userId)),
    db.select().from(costRecords).where(eq(costRecords.userId, userId)),
    db.select().from(reminders).where(eq(reminders.userId, userId)),
    db.select().from(chargingSessions).where(eq(chargingSessions.userId, userId)),
    db.select().from(batteryChecks).where(eq(batteryChecks.userId, userId)),
  ]);
  return { vehicles: vs, fuel, maintenance, costs, reminders: rems, charging: charges, batteryChecks: battery };
}

/** Saved stations/networks plus names used in the last 12 months (across all vehicles), for the station picker. */
export const getPlaces = cache(async (userId: string, kind: PlaceKind): Promise<PlacesData> => {
  const since = new Date(Date.now() - 365 * 86_400_000).toISOString().slice(0, 10);
  const col = kind === "fuel" ? fuelEntries.station : chargingSessions.network;
  const table = kind === "fuel" ? fuelEntries : chargingSessions;
  const [saved, used] = await Promise.all([
    db
      .select()
      .from(savedPlaces)
      .where(and(eq(savedPlaces.userId, userId), eq(savedPlaces.kind, kind))),
    db
      .select({ key: sql<string>`lower(trim(${col}))`, name: sql<string>`max(trim(${col}))`, uses: sql<number>`count(*)::int`, last: sql<string>`max(${table.date})` })
      .from(table)
      .where(and(eq(table.userId, userId), gte(table.date, since), sql`coalesce(trim(${col}), '') <> ''`))
      .groupBy(sql`lower(trim(${col}))`),
  ]);
  const usage = new Map(used.map((u) => [u.key, u]));
  const options: PlaceOption[] = saved.map((p) => {
    const u = usage.get(placeKey(p.name));
    usage.delete(placeKey(p.name));
    return { id: p.id, name: p.name, saved: true, uses: u?.uses ?? 0, lastUsed: u?.last ?? null, lat: p.lat, lng: p.lng };
  });
  for (const u of usage.values()) options.push({ id: null, name: u.name, saved: false, uses: u.uses, lastUsed: u.last, lat: null, lng: null });
  return { kind, options: sortPlaces(options) };
});

/** Layout and report choices, with defaults filled in. */
export const getPrefs = cache(async (userId: string) => {
  const [row] = await db.select().from(userPrefs).where(eq(userPrefs.userId, userId));
  return { dashboard: normalizeDash(row?.dashboard), reports: normalizeReports(row?.reports), history: normalizeHistory(row?.history) };
});

/** Support tickets with a staff reply the customer hasn't opened yet (for the "Support" badge). */
export const unreadSupportCount = cache(async (userId: string, email: string) => {
  const { feedback, ticketMessages } = await import("@/db/schema");
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(feedback)
    .where(
      sql`(${feedback.userId} = ${userId} or lower(${feedback.email}) = ${email.toLowerCase()}) and exists (select 1 from ${ticketMessages} m where m.ticket_id = ${feedback.id} and m.kind = 'reply' and m.created_at > coalesce(${feedback.customerSeenAt}, 'epoch'::timestamptz))`,
    );
  return r?.n ?? 0;
});
