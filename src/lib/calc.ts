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

export type Category = "Fuel" | "Maintenance" | "Insurance" | "Other";
export const CATEGORIES: Category[] = ["Fuel", "Maintenance", "Insurance", "Other"];

export type DatedAmount = { date: string; cents: number; cat: Category };

export function allDated(fuel: FuelRow[], maint: MaintRow[], costs: CostRow[]): DatedAmount[] {
  return [
    ...fuel.map((r) => ({ date: r.date, cents: r.totalPaidCents, cat: "Fuel" as const })),
    ...maint.map((r) => ({ date: r.date, cents: r.totalCostCents, cat: "Maintenance" as const })),
    ...costs.map((r) => ({
      date: r.date,
      cents: r.amountCents,
      cat: (r.type === "Insurance" ? "Insurance" : "Other") as Category,
    })),
  ].filter((r) => r.date);
}

export function totalsByCategory(rows: DatedAmount[]): Record<Category, number> {
  const out: Record<Category, number> = { Fuel: 0, Maintenance: 0, Insurance: 0, Other: 0 };
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
) {
  const odos = [...fuel, ...maint].map((r) => r.odometer).filter((o): o is number => o != null);
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
    if (!byMonth.has(k)) byMonth.set(k, { Fuel: 0, Maintenance: 0, Insurance: 0, Other: 0 });
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
    if (r.date <= beforeDate) {
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
    if (r.date >= afterDate && r.odometer < newOdo) {
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
