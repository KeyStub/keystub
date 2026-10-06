/**
 * Writes a mapped legacy export into the database for one user, inside a single transaction,
 * and verifies counts + cent totals against the raw file before committing. Any mismatch rolls
 * the whole import back — nothing partial is ever left behind.
 *
 * Re-running is safe: records are matched on (userId, legacyId) and updated rather than duplicated.
 * Nothing is ever deleted by an import.
 */
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  mapExport,
  summarizeMapped,
  summarizeRaw,
  type ExportSummary,
  type LegacyExport,
} from "@/lib/legacy-import";
import type { DB } from "./client";
import { costRecords, fuelEntries, importLog, maintenanceRecords, reminders, vehicles } from "./schema";

export class ImportVerificationError extends Error {}

export type ImportResult = {
  expected: ExportSummary;
  written: ExportSummary;
  inserted: number;
  updated: number;
  vehicleIds: string[];
};

export async function importExport(
  db: DB,
  userId: string,
  raw: LegacyExport,
  opts: { source: string; targetVehicleId?: string; dryRun?: boolean },
): Promise<ImportResult> {
  const expected = summarizeRaw(raw);
  const mapped = mapExport(raw);
  if (mapped.errors.length) throw new ImportVerificationError(mapped.errors.join("\n"));
  const mappedSummary = summarizeMapped(mapped);
  if (JSON.stringify(mappedSummary) !== JSON.stringify(expected))
    throw new ImportVerificationError(
      `Mapping changed the totals.\nfile:   ${JSON.stringify(expected)}\nmapped: ${JSON.stringify(mappedSummary)}`,
    );

  let inserted = 0;
  let updated = 0;

  const run = async (tx: DB) => {
    /* ---- vehicles ---- */
    const vehicleIdMap = new Map<string | null, string>();
    if (opts.targetVehicleId) {
      const [t] = await tx
        .select({ id: vehicles.id })
        .from(vehicles)
        .where(and(eq(vehicles.userId, userId), eq(vehicles.id, opts.targetVehicleId)));
      if (!t) throw new ImportVerificationError("Target vehicle not found.");
    }
    for (const v of mapped.vehicles) {
      if (opts.targetVehicleId) {
        // Restoring into an existing vehicle: update its profile only where the file has values.
        const patch = Object.fromEntries(Object.entries(v).filter(([k, val]) => val !== null && k !== "legacyId"));
        if (Object.keys(patch).length)
          await tx
            .update(vehicles)
            .set({ ...patch, updatedAt: new Date() })
            .where(and(eq(vehicles.userId, userId), eq(vehicles.id, opts.targetVehicleId)));
        vehicleIdMap.set(v.legacyId, opts.targetVehicleId);
        continue;
      }
      const existing = v.legacyId
        ? await tx
            .select({ id: vehicles.id })
            .from(vehicles)
            .where(and(eq(vehicles.userId, userId), eq(vehicles.legacyId, v.legacyId)))
        : [];
      if (existing[0]) {
        await tx.update(vehicles).set({ ...v, updatedAt: new Date() }).where(eq(vehicles.id, existing[0].id));
        vehicleIdMap.set(v.legacyId, existing[0].id);
      } else {
        const [row] = await tx.insert(vehicles).values({ ...v, userId }).returning({ id: vehicles.id });
        vehicleIdMap.set(v.legacyId, row.id);
      }
    }
    const fallbackVehicle =
      opts.targetVehicleId ?? (vehicleIdMap.size === 1 ? [...vehicleIdMap.values()][0] : undefined);
    const resolveVehicle = (legacyVehicleId: string | null, what: string) => {
      const id = vehicleIdMap.get(legacyVehicleId) ?? fallbackVehicle;
      if (!id) throw new ImportVerificationError(`${what}: can't tell which vehicle it belongs to.`);
      return id;
    };

    /* ---- records: upsert by legacyId ---- */
    async function upsert<T extends { legacyId: string | null; legacyVehicleId?: string | null }>(
      table: typeof fuelEntries | typeof maintenanceRecords | typeof costRecords,
      rows: T[],
      label: string,
    ) {
      for (const r of rows) {
        const { legacyVehicleId, ...rest } = r;
        const values = {
          ...rest,
          userId,
          vehicleId: resolveVehicle(legacyVehicleId ?? null, `${label} ${r.legacyId}`),
        };
        const found = r.legacyId
          ? await tx
              .select({ id: table.id })
              .from(table)
              .where(and(eq(table.userId, userId), eq(table.legacyId, r.legacyId)))
          : [];
        if (found[0]) {
          await tx
            .update(table)
            .set({ ...values, updatedAt: new Date() } as never)
            .where(eq(table.id, found[0].id));
          updated++;
        } else {
          await tx.insert(table).values(values as never);
          inserted++;
        }
      }
    }
    await upsert(fuelEntries, mapped.fuel, "Fuel");
    await upsert(maintenanceRecords, mapped.maintenance, "Maintenance");
    await upsert(costRecords, mapped.costs, "Cost");

    for (const r of mapped.reminders) {
      const { legacyVehicleId, completed, legacyId, ...rest } = r;
      void legacyId;
      await tx.insert(reminders).values({
        ...rest,
        sourceType: rest.sourceType ?? "manual",
        completedAt: completed ? new Date() : null,
        userId,
        vehicleId: resolveVehicle(legacyVehicleId, "Reminder"),
      });
      inserted++;
    }

    /* ---- verify what is now in the DB for exactly these records ---- */
    const vehicleIds = [...new Set(vehicleIdMap.values())];
    const sumFor = async (
      table: typeof fuelEntries | typeof maintenanceRecords | typeof costRecords,
      cents: typeof fuelEntries.totalPaidCents | typeof maintenanceRecords.totalCostCents | typeof costRecords.amountCents,
      legacyIds: (string | null)[],
    ) => {
      const ids = legacyIds.filter((x): x is string => !!x);
      const noIdCount = legacyIds.length - ids.length;
      if (noIdCount) {
        // Rows without a source id can't be singled out afterwards, so they can't be verified.
        throw new ImportVerificationError(
          "Some records in the file have no id, so the import can't be verified. Re-export the file from the tracker and try again.",
        );
      }
      if (!ids.length) return { count: 0, cents: 0 };
      const [row] = await tx
        .select({ count: sql<number>`count(*)::int`, cents: sql<number>`coalesce(sum(${cents}),0)::bigint` })
        .from(table)
        .where(and(eq(table.userId, userId), inArray(table.legacyId, ids)));
      return { count: Number(row.count), cents: Number(row.cents) };
    };
    const written: ExportSummary = {
      vehicles: vehicleIds.length,
      fuel: await sumFor(fuelEntries, fuelEntries.totalPaidCents, mapped.fuel.map((r) => r.legacyId)),
      maintenance: await sumFor(
        maintenanceRecords,
        maintenanceRecords.totalCostCents,
        mapped.maintenance.map((r) => r.legacyId),
      ),
      costs: await sumFor(costRecords, costRecords.amountCents, mapped.costs.map((r) => r.legacyId)),
      reminders: mapped.reminders.length,
    };
    const exp = { ...expected, vehicles: opts.targetVehicleId ? 1 : expected.vehicles };
    if (JSON.stringify(written) !== JSON.stringify(exp))
      throw new ImportVerificationError(
        `Database totals don't match the file — import rolled back.\nfile: ${JSON.stringify(exp)}\ndb:   ${JSON.stringify(written)}`,
      );

    await tx.insert(importLog).values({
      userId,
      source: opts.source,
      summary: JSON.stringify({ expected: exp, written, inserted, updated, matched: true }),
    });

    if (opts.dryRun) throw new DryRunRollback({ expected: exp, written, inserted, updated, vehicleIds });
    return { expected: exp, written, inserted, updated, vehicleIds };
  };

  try {
    return await db.transaction(async (tx) => run(tx as unknown as DB));
  } catch (e) {
    if (e instanceof DryRunRollback) return e.result;
    throw e;
  }
}

class DryRunRollback extends Error {
  constructor(public result: ImportResult) {
    super("dry run");
  }
}
