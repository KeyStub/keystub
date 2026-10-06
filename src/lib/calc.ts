/**
 * Dashboard / report calculations, ported from the original single-file tracker so the numbers
 * match what Jarin is used to seeing. All money values are integer cents.
 */

export type FuelRow = {
  id: string;
  date: string;
  totalPaidCents: number;
  odometer: number | null;
  litres: number | null;
  fillType: string | null;
};
export type MaintRow = { id: string; date: string; totalCostCents: number; odometer: number | null };
export type CostRow = { id: string; date: string; type: string; amountCents: number };
export type ChargeRow = {
  id: string;
  date: string;
  kwh: number;
  costCents: number;
  location: string;
  odometer: number | null;
};

export type Category = "Fuel" | "Charging" | "Maintenance" | "Insurance" | "Other";
export const CATEGORIES: Category[] = ["Fuel", "Charging", "Maintenance", "Insurance", "Other"];

/** Cost types that are money back (government EV rebates, incentives): they reduce the total. */
export const CREDIT_TYPES = ["Rebate / incentive"];

export type DatedAmount = { date: string; cents: number; cat: Category };

export function allDated(fuel: FuelRow[], maint: MaintRow[], costs: CostRow[], charges: ChargeRow[] = []): DatedAmount[] {
  return [
    ...fuel.map((r) => ({ date: r.date, cents: r.totalPaidCents, cat: "Fuel" as const })),
    ...charges.map((r) => ({ date: r.date, cents: r.costCents, cat: "Charging" as const })),
    ...maint.map((r) => ({ date: r.date, cents: r.totalCostCents, cat: "Maintenance" as const })),
    ...costs.map((r) => ({
      date: r.date,
      cents: CREDIT_TYPES.includes(r.type) ? -r.amountCents : r.amountCents,
      cat: (r.type === "Insurance" ? "Insurance" : "Other") as Category,
    })),
  ].filter((r) => r.date);
}

export function totalsByCategory(rows: DatedAmount[]): Record<Category, number> {
  const out: Record<Category, number> = { Fuel: 0, Charging: 0, Maintenance: 0, Insurance: 0, Other: 0 };
  for (const r of rows) out[r.cat] += r.cents;
  return out;
}

export function sumInRange(rows: DatedAmount[], from: string, to: string) {
  return rows.filter((r) => r.date >= from && r.date <= to).reduce((s, r) => s + r.cents, 0);
}

/** Inclusive count of calendar months from `fromISO` to `today` (minimum 1), as in the original app. */
export function monthsSince(fromISO: string, today: string) {
  const [fy, fm] = fromISO.split("-").map(Number);
  const [ty, tm] = today.split("-").map(Number);
  return Math.max(1, (ty - fy) * 12 + (tm - fm) + 1);
}

/** Distance covered by recorded odometer readings (max − min), or null if fewer than 2 distinct readings. */
export function kmRecorded(
  fuel: { odometer: number | null }[],
  maint: { odometer: number | null }[],
  currentOdometer: number | null,
  extra: { odometer: number | null }[] = [],
) {
  const odos = [...fuel, ...maint, ...extra].map((r) => r.odometer).filter((o): o is number => o != null);
  if (currentOdometer != null) odos.push(currentOdometer);
  if (odos.length < 2) return null;
  const min = Math.min(...odos);
  const max = Math.max(...odos);
  return max > min ? max - min : null;
}

/** Full-tank-to-full-tank fuel economy (L/100 km). */
export function fuelEconomySeries(fuel: FuelRow[]) {
  const rows = fuel
    .filter((r) => r.odometer != null && r.litres != null)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || a.odometer! - b.odometer!);
  const out: { date: string; l100: number; dist: number }[] = [];
  let lastFull: FuelRow | null = null;
  let litresSince = 0;
  for (const r of rows) {
    if (lastFull) litresSince += r.litres ?? 0;
    if (r.fillType === "full") {
      if (lastFull && r.odometer! > lastFull.odometer!) {
        const dist = r.odometer! - lastFull.odometer!;
        out.push({ date: r.date, l100: (litresSince / dist) * 100, dist });
      }
      lastFull = r;
      litresSince = 0;
    }
  }
  return out;
}

export function monthlyTrend(rows: DatedAmount[], lastN = 12) {
  const byMonth = new Map<string, Record<Category, number>>();
  for (const r of rows) {
    const k = r.date.slice(0, 7);
    if (!byMonth.has(k)) byMonth.set(k, { Fuel: 0, Charging: 0, Maintenance: 0, Insurance: 0, Other: 0 });
    byMonth.get(k)![r.cat] += r.cents;
  }
  return [...byMonth.keys()]
    .sort()
    .slice(-lastN)
    .map((month) => ({ month, ...byMonth.get(month)! }));
}

/* ---------- validation (duplicate + odometer regression), mirrored from the original ---------- */

type OdoRow = { id: string; date: string; odometer: number | null };

export function priorOdometer(rows: OdoRow[], beforeDate: string, excludeId?: string | null) {
  let best: { date: string; odo: number } | null = null;
  for (const r of rows) {
    if (r.id === excludeId || r.odometer == null) continue;
    if (r.date < beforeDate) {
      if (!best || r.date > best.date || (r.date === best.date && r.odometer > best.odo))
        best = { date: r.date, odo: r.odometer };
    }
  }
  return best;
}

export function laterLowerOdometer(rows: OdoRow[], afterDate: string, newOdo: number, excludeId?: string | null) {
  let hit: { date: string; odo: number } | null = null;
  for (const r of rows) {
    if (r.id === excludeId || r.odometer == null) continue;
    if (r.date > afterDate && r.odometer < newOdo) {
      if (!hit || r.date < hit.date) hit = { date: r.date, odo: r.odometer };
    }
  }
  return hit;
}

export function odometerAnomalies(rows: (OdoRow & { src: string })[]) {
  const sorted = rows.filter((r) => r.odometer != null).sort((a, b) => a.date.localeCompare(b.date));
  const out: { src: string; date: string; odo: number; prevDate: string; prevOdo: number }[] = [];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].odometer! < sorted[i - 1].odometer!)
      out.push({
        src: sorted[i].src,
        date: sorted[i].date,
        odo: sorted[i].odometer!,
        prevDate: sorted[i - 1].date,
        prevOdo: sorted[i - 1].odometer!,
      });
  }
  return out;
}

/* ---------- reminders ---------- */

export type ReminderStatus = "overdue" | "soon" | "upcoming";

export function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
}

export function reminderStatus(
  r: { dueDate: string | null; dueOdometer: number | null },
  today: string,
  currentOdometer: number | null,
  leadDays = 30,
  leadKm = 500,
): ReminderStatus {
  let overdue = false;
  let soon = false;
  if (r.dueDate) {
    const d = daysBetween(today, r.dueDate);
    if (d < 0) overdue = true;
    else if (d <= leadDays) soon = true;
  }
  if (r.dueOdometer != null && currentOdometer != null) {
    const diff = r.dueOdometer - currentOdometer;
    if (diff < 0) overdue = true;
    else if (diff <= leadKm) soon = true;
  }
  return overdue ? "overdue" : soon ? "soon" : "upcoming";
}

/* ---------- EV charging ---------- */

export type ChargingStats = {
  sessions: number;
  totalKwh: number;
  totalCents: number;
  /** average price paid per kWh, in dollars (null if no kWh) */
  avgPricePerKwh: number | null;
  /** share of kWh by where it was charged */
  byLocation: Record<string, { kwh: number; cents: number; count: number }>;
  /** kWh per 100 km measured at the charger (includes charging losses); null until 2+ odometer readings */
  kwhPer100: number | null;
  /** distance covered between the first and last charge with an odometer reading */
  distanceKm: number | null;
  /** energy cost per km over that same span, in cents */
  centsPerKm: number | null;
  /** what the same distance would have cost in fuel, and the difference, in cents */
  gasEquivalentCents: number | null;
  savingsCents: number | null;
};

/**
 * Efficiency uses the energy added *after* the first odometer reading: that is the energy that
 * replaced what was used to drive the measured distance.
 */
export function chargingStats(rows: ChargeRow[], compare: { l100: number; fuelPrice: number }): ChargingStats {
  const totalKwh = rows.reduce((t, r) => t + r.kwh, 0);
  const totalCents = rows.reduce((t, r) => t + r.costCents, 0);
  const byLocation: ChargingStats["byLocation"] = {};
  for (const r of rows) {
    const b = (byLocation[r.location] ??= { kwh: 0, cents: 0, count: 0 });
    b.kwh += r.kwh;
    b.cents += r.costCents;
    b.count += 1;
  }
  // Chronological order; within a day, by odometer (sessions without one go last).
  const ordered = rows
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || (a.odometer ?? Infinity) - (b.odometer ?? Infinity));
  const firstIdx = ordered.findIndex((r) => r.odometer != null);
  const lastIdx = ordered.findLastIndex((r) => r.odometer != null);
  let kwhPer100: number | null = null;
  let distanceKm: number | null = null;
  let centsPerKm: number | null = null;
  let gasEquivalentCents: number | null = null;
  let savingsCents: number | null = null;
  if (firstIdx >= 0 && lastIdx > firstIdx) {
    const dist = ordered[lastIdx].odometer! - ordered[firstIdx].odometer!;
    if (dist > 0) {
      const after = ordered.slice(firstIdx + 1, lastIdx + 1);
      const kwh = after.reduce((t, r) => t + r.kwh, 0);
      const cents = after.reduce((t, r) => t + r.costCents, 0);
      distanceKm = dist;
      kwhPer100 = (kwh / dist) * 100;
      centsPerKm = cents / dist;
      const litres = (dist * compare.l100) / 100;
      gasEquivalentCents = Math.round(litres * compare.fuelPrice * 100);
      savingsCents = gasEquivalentCents - cents;
    }
  }
  return {
    sessions: rows.length,
    totalKwh,
    totalCents,
    avgPricePerKwh: totalKwh > 0 ? totalCents / 100 / totalKwh : null,
    byLocation,
    kwhPer100,
    distanceKm,
    centsPerKm,
    gasEquivalentCents,
    savingsCents,
  };
}

export const CHARGE_LOCATIONS: Record<string, string> = {
  home: "Home",
  work: "Work",
  public: "Public (Level 2)",
  fast: "DC fast",
  other: "Other",
};

export const POWERTRAINS = [
  { id: "gas", label: "Gas" },
  { id: "diesel", label: "Diesel" },
  { id: "hybrid", label: "Hybrid" },
  { id: "phev", label: "Plug-in hybrid" },
  { id: "ev", label: "Electric (EV)" },
] as const;
export type Powertrain = (typeof POWERTRAINS)[number]["id"];
export const usesFuel = (p: string) => p !== "ev";
export const usesCharging = (p: string) => p === "ev" || p === "phev";
