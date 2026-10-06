/**
 * Maps a Santa Fe Tracker (Claude Artifact) export / backup into rows for the new schema.
 *
 * Pure functions only — no database access — so the mapping and the totals check can be
 * unit-tested and reused by both the CLI import script and the in-app "Restore backup" flow.
 *
 * Field-name drift handled here (the old app wrote different names than the migrated records had):
 *   fuel:        fullTank (bool) | fillType ("full"/"partial")   →  fillType
 *                fuelGrade | grade                               →  grade
 *   maintenance: taxCost | tax                                   →  taxCents
 *                warrantyInfo | warranty                         →  warrantyInfo
 */

export type LegacyExport = {
  vehicles?: Record<string, unknown>[];
  vehicle?: Record<string, unknown> | null; // backupVersion 2 files from the old app use a single `vehicle`
  fuel?: Record<string, unknown>[];
  maintenance?: Record<string, unknown>[];
  costs?: Record<string, unknown>[];
  reminders?: Record<string, unknown>[];
};

/** Records we were asked to carry over unchanged but flag for review (see handoff + 2026-09-30 audit). */
export const REVIEW_FLAGS: Record<string, string> = {
  "legacy-gas-0018":
    "Possible duplicate: same $72.74 as the bank-matched 2025-09-06 fill-up, exactly one year earlier. No bank transaction or station on file — likely a legacy date-entry error.",
  "legacy-gas-0027":
    "Possible duplicate: bank-matched $65.30 fill-up on the same day (2026-02-18). No bank transaction or station on file.",
  "legacy-gas-0038":
    "Check against bank statement: a separate $77.81 fill-up at the same station is also recorded on 2026-09-16.",
};

const str = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
};
const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const int = (v: unknown): number | null => {
  const n = num(v);
  return n === null ? null : Math.round(n);
};
/** Dollars → integer cents, rounding to the nearest cent to avoid float drift ($0.1 + $0.2 problems). */
export const toCents = (v: unknown): number | null => {
  const n = num(v);
  return n === null ? null : Math.round(n * 100);
};
const date = (v: unknown): string | null => {
  const s = str(v);
  return s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
};
const bool = (v: unknown) => v === true || v === "true";

export type MappedVehicle = ReturnType<typeof mapVehicle>;
export function mapVehicle(v: Record<string, unknown>) {
  return {
    legacyId: str(v.id),
    year: int(v.year),
    make: str(v.make),
    model: str(v.model),
    trim: str(v.trim),
    vin: str(v.vin),
    plate: str(v.plate),
    purchasePriceCents: toCents(v.purchasePrice),
    purchaseDate: date(v.purchaseDate),
    currentOdometer: int(v.currentOdometer),
    insuranceProvider: str(v.insuranceProvider),
    insurancePolicyCostCents: toCents(v.insurancePolicyCost),
    insuranceRenewalDate: date(v.insuranceRenewalDate),
    registrationRenewalDate: date(v.registrationRenewalDate),
    notes: str(v.notes),
  };
}

export function mapFuel(r: Record<string, unknown>) {
  let fillType: "full" | "partial" | null = null;
  if (r.fillType === "full" || r.fillType === "partial") fillType = r.fillType;
  else if (r.fullTank === true) fillType = "full";
  else if (r.fullTank === false) fillType = "partial";
  const legacyId = str(r.id);
  return {
    legacyId,
    legacyVehicleId: str(r.vehicleId),
    date: date(r.date),
    totalPaidCents: toCents(r.totalPaid),
    odometer: int(r.odometer),
    litres: num(r.litres),
    pricePerLitre: num(r.pricePerLitre),
    fillType,
    grade: str(r.grade) ?? str(r.fuelGrade),
    station: str(r.station),
    notes: str(r.notes),
    legacy: bool(r.legacy),
    reviewFlag: (legacyId && REVIEW_FLAGS[legacyId]) || null,
  };
}

export function mapMaintenance(r: Record<string, unknown>) {
  const legacyId = str(r.id);
  return {
    legacyId,
    legacyVehicleId: str(r.vehicleId),
    date: date(r.date),
    category: str(r.category),
    description: str(r.description),
    shop: str(r.shop),
    partsCents: toCents(r.partsCost),
    labourCents: toCents(r.labourCost),
    taxCents: toCents(r.taxCost ?? r.tax),
    totalCostCents: toCents(r.totalCost),
    odometer: int(r.odometer),
    nextServiceDate: date(r.nextServiceDate),
    nextServiceOdometer: int(r.nextServiceOdometer),
    warrantyInfo: str(r.warrantyInfo ?? r.warranty),
    receiptRef: str(r.receiptRef),
    notes: str(r.notes),
    legacy: bool(r.legacy),
    reviewFlag: (legacyId && REVIEW_FLAGS[legacyId]) || null,
  };
}

export function mapCost(r: Record<string, unknown>) {
  const legacyId = str(r.id);
  return {
    legacyId,
    legacyVehicleId: str(r.vehicleId),
    date: date(r.date),
    type: str(r.type) ?? "Other",
    amountCents: toCents(r.amount),
    provider: str(r.provider),
    nextDueDate: date(r.nextDueDate),
    notes: str(r.notes),
    legacy: bool(r.legacy),
    reviewFlag: (legacyId && REVIEW_FLAGS[legacyId]) || null,
  };
}

export function mapReminder(r: Record<string, unknown>) {
  return {
    legacyId: str(r.id),
    legacyVehicleId: str(r.vehicleId),
    title: str(r.title) ?? "Reminder",
    type: str(r.type),
    dueDate: date(r.dueDate),
    dueOdometer: int(r.dueOdometer),
    completed: bool(r.completed),
    sourceType: str(r.sourceType),
  };
}

export type Totals = { count: number; cents: number };
export type ExportSummary = {
  vehicles: number;
  fuel: Totals;
  maintenance: Totals;
  costs: Totals;
  reminders: number;
};

export type MappedExport = {
  vehicles: MappedVehicle[];
  fuel: ReturnType<typeof mapFuel>[];
  maintenance: ReturnType<typeof mapMaintenance>[];
  costs: ReturnType<typeof mapCost>[];
  reminders: ReturnType<typeof mapReminder>[];
  errors: string[];
};

export function mapExport(raw: LegacyExport): MappedExport {
  const vehicles = [...(raw.vehicles ?? []), ...(raw.vehicle ? [raw.vehicle] : [])].map(mapVehicle);
  const fuel = (raw.fuel ?? []).map(mapFuel);
  const maintenance = (raw.maintenance ?? []).map(mapMaintenance);
  const costs = (raw.costs ?? []).map(mapCost);
  const reminders = (raw.reminders ?? []).map(mapReminder);

  const errors: string[] = [];
  fuel.forEach((r) => {
    if (!r.date) errors.push(`Fuel ${r.legacyId}: missing/invalid date`);
    if (r.totalPaidCents === null) errors.push(`Fuel ${r.legacyId}: missing total paid`);
  });
  maintenance.forEach((r) => {
    if (!r.date) errors.push(`Maintenance ${r.legacyId}: missing/invalid date`);
    if (r.totalCostCents === null) errors.push(`Maintenance ${r.legacyId}: missing total cost`);
  });
  costs.forEach((r) => {
    if (!r.date) errors.push(`Cost ${r.legacyId}: missing/invalid date`);
    if (r.amountCents === null) errors.push(`Cost ${r.legacyId}: missing amount`);
  });
  if ((fuel.length || maintenance.length || costs.length) && vehicles.length === 0)
    errors.push("File has records but no vehicle.");

  return { vehicles, fuel, maintenance, costs, reminders, errors };
}

/** Totals computed from the raw file (independent of the mapping) — the "before" side of the check. */
export function summarizeRaw(raw: LegacyExport): ExportSummary {
  const sum = (rows: Record<string, unknown>[] | undefined, key: string): Totals => ({
    count: rows?.length ?? 0,
    cents: (rows ?? []).reduce((t, r) => t + (toCents(r[key]) ?? 0), 0),
  });
  return {
    vehicles: (raw.vehicles?.length ?? 0) + (raw.vehicle ? 1 : 0),
    fuel: sum(raw.fuel, "totalPaid"),
    maintenance: sum(raw.maintenance, "totalCost"),
    costs: sum(raw.costs, "amount"),
    reminders: raw.reminders?.length ?? 0,
  };
}

export function summarizeMapped(m: MappedExport): ExportSummary {
  return {
    vehicles: m.vehicles.length,
    fuel: { count: m.fuel.length, cents: m.fuel.reduce((t, r) => t + (r.totalPaidCents ?? 0), 0) },
    maintenance: {
      count: m.maintenance.length,
      cents: m.maintenance.reduce((t, r) => t + (r.totalCostCents ?? 0), 0),
    },
    costs: { count: m.costs.length, cents: m.costs.reduce((t, r) => t + (r.amountCents ?? 0), 0) },
    reminders: m.reminders.length,
  };
}

export function summariesEqual(a: ExportSummary, b: ExportSummary) {
  return JSON.stringify(a) === JSON.stringify(b);
}
