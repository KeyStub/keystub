import "server-only";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { batteryChecks, chargingSessions, costRecords, fuelEntries, maintenanceRecords, reminders, vehicles } from "@/db/schema";

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
