/** Per-user layout and report choices (stored in user_prefs as JSON). Shared by server and browser. */

export const DASH_TILES = [
  { id: "month", label: "This month" },
  { id: "ytd", label: "Year to date" },
  { id: "total", label: "Total ownership cost" },
  { id: "avg", label: "Average monthly cost" },
  { id: "perDist", label: "Cost per km / mile" },
  { id: "withVehicle", label: "Total + vehicle price" },
] as const;

export const DASH_CARDS = [
  { id: "quick", label: "Quick fill-up / quick charge", hint: "Log today's fill-up or charge in a few taps" },
  { id: "reminders", label: "Reminders", hint: "What's due next" },
  { id: "breakdown", label: "Spending breakdown", hint: "Bar chart by category" },
  { id: "recent", label: "Recent activity", hint: "Your last 8 entries" },
  { id: "efficiency", label: "Fuel economy / charging", hint: "Real-world L/100 km, MPG or EV efficiency and savings" },
] as const;

export type TileId = (typeof DASH_TILES)[number]["id"];
export type CardId = (typeof DASH_CARDS)[number]["id"];
export type Item<T extends string> = { id: T; on: boolean };
export type DashPrefs = { tiles: Item<TileId>[]; cards: Item<CardId>[] };

export const REPORT_SECTIONS = [
  { id: "totals", label: "Totals by category" },
  { id: "trend", label: "Monthly trend chart" },
  { id: "records", label: "Itemized list of every entry" },
] as const;
export type ReportSection = (typeof REPORT_SECTIONS)[number]["id"];
export const REPORT_CATS = ["Fuel", "Charging", "Maintenance", "Insurance", "Other"] as const;
export type ReportPrefs = { sections: ReportSection[]; cats: (typeof REPORT_CATS)[number][] };

export const HISTORY_OPTIONS = [
  { id: "costs", label: "Costs", hint: "Turn off to share the work done without prices" },
  { id: "odometer", label: "Odometer readings" },
  { id: "shop", label: "Shop / provider" },
  { id: "refs", label: "Receipt and invoice references" },
  { id: "notes", label: "Notes and warranty info" },
  { id: "washes", label: "Car washes" },
] as const;
export type HistoryOption = (typeof HISTORY_OPTIONS)[number]["id"];
export type HistoryPrefs = { show: HistoryOption[] };

export const DEFAULT_DASH: DashPrefs = {
  tiles: DASH_TILES.map((t) => ({ id: t.id, on: true })),
  cards: DASH_CARDS.map((c) => ({ id: c.id, on: true })),
};
export const DEFAULT_REPORTS: ReportPrefs = { sections: ["totals", "trend"], cats: [...REPORT_CATS] };
export const DEFAULT_HISTORY: HistoryPrefs = { show: ["costs", "odometer", "shop", "refs"] };

/** Keep saved order, drop unknown ids, append anything new (so new cards appear for everyone). */
function mergeItems<T extends string>(saved: unknown, all: readonly { id: T }[]): Item<T>[] {
  const ids = all.map((a) => a.id);
  const list = Array.isArray(saved) ? (saved as Item<T>[]).filter((x) => x && ids.includes(x.id)) : [];
  const seen = new Set(list.map((x) => x.id));
  return [...list.map((x) => ({ id: x.id, on: x.on !== false })), ...ids.filter((id) => !seen.has(id)).map((id) => ({ id, on: true }))];
}

export function normalizeDash(v: unknown): DashPrefs {
  const o = (v ?? {}) as Partial<DashPrefs>;
  return { tiles: mergeItems(o.tiles, DASH_TILES), cards: mergeItems(o.cards, DASH_CARDS) };
}

const pick = <T extends string>(v: unknown, ok: readonly T[], d: T[]): T[] => (Array.isArray(v) ? (v.filter((x) => ok.includes(x as T)) as T[]) : d);

export function normalizeReports(v: unknown): ReportPrefs {
  const o = (v ?? {}) as Partial<ReportPrefs>;
  const sections = pick(o.sections, REPORT_SECTIONS.map((s) => s.id), DEFAULT_REPORTS.sections);
  const cats = pick(o.cats, REPORT_CATS, DEFAULT_REPORTS.cats);
  return { sections, cats: cats.length ? cats : [...REPORT_CATS] };
}

export function normalizeHistory(v: unknown): HistoryPrefs {
  const o = (v ?? {}) as Partial<HistoryPrefs>;
  return { show: pick(o.show, HISTORY_OPTIONS.map((h) => h.id), DEFAULT_HISTORY.show) };
}
