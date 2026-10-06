/**
 * Units & currency. Everything is STORED in metric (km, litres, L/100 km, kWh/100 km, $ per litre)
 * and money is integer cents in the user's own currency (never converted). These helpers convert
 * to and from what each user sees and types. Safe on the server and in the browser.
 */

export type DistanceUnit = "km" | "mi";
export type VolumeUnit = "L" | "gal" | "impgal";
export type EconomyUnit = "l100" | "kml" | "mpg" | "mpgimp";

export type UnitPrefs = {
  distanceUnit: DistanceUnit;
  volumeUnit: VolumeUnit;
  economyUnit: EconomyUnit;
  currency: string;
};

export const DEFAULT_UNITS: UnitPrefs = { distanceUnit: "km", volumeUnit: "L", economyUnit: "l100", currency: "CAD" };

export const KM_PER_MI = 1.609344;
const L_PER = { L: 1, gal: 3.785411784, impgal: 4.54609 } as const;

export const DISTANCE_UNITS: { id: DistanceUnit; label: string }[] = [
  { id: "km", label: "Kilometres (km)" },
  { id: "mi", label: "Miles (mi)" },
];
export const VOLUME_UNITS: { id: VolumeUnit; label: string }[] = [
  { id: "L", label: "Litres (L)" },
  { id: "gal", label: "US gallons (gal)" },
  { id: "impgal", label: "Imperial gallons (UK gal)" },
];
export const ECONOMY_UNITS: { id: EconomyUnit; label: string }[] = [
  { id: "l100", label: "L/100 km" },
  { id: "kml", label: "km/L" },
  { id: "mpg", label: "MPG (US)" },
  { id: "mpgimp", label: "MPG (UK)" },
];
export const CURRENCIES: { id: string; label: string; locale: string }[] = [
  { id: "CAD", label: "Canadian dollar (CAD)", locale: "en-CA" },
  { id: "USD", label: "US dollar (USD)", locale: "en-US" },
  { id: "GBP", label: "British pound (GBP)", locale: "en-GB" },
  { id: "EUR", label: "Euro (EUR)", locale: "en-IE" },
  { id: "AUD", label: "Australian dollar (AUD)", locale: "en-AU" },
  { id: "NZD", label: "New Zealand dollar (NZD)", locale: "en-NZ" },
];

/** One-click presets shown in settings; individual units can still be mixed. */
export const UNIT_PRESETS: { id: string; label: string; prefs: Omit<UnitPrefs, "currency">; currency: string }[] = [
  { id: "ca", label: "Canada", prefs: { distanceUnit: "km", volumeUnit: "L", economyUnit: "l100" }, currency: "CAD" },
  { id: "us", label: "United States", prefs: { distanceUnit: "mi", volumeUnit: "gal", economyUnit: "mpg" }, currency: "USD" },
  { id: "uk", label: "United Kingdom", prefs: { distanceUnit: "mi", volumeUnit: "L", economyUnit: "mpgimp" }, currency: "GBP" },
];

const EUROZONE = "AT BE CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK".split(" ");

/** Sensible defaults for a new account, from the visitor's country (2-letter code). */
export function defaultsForCountry(country: string | null | undefined): UnitPrefs {
  const c = (country ?? "").toUpperCase();
  if (c === "US" || c === "PR") return { distanceUnit: "mi", volumeUnit: "gal", economyUnit: "mpg", currency: "USD" };
  if (c === "GB") return { distanceUnit: "mi", volumeUnit: "L", economyUnit: "mpgimp", currency: "GBP" };
  if (c === "AU") return { ...DEFAULT_UNITS, currency: "AUD" };
  if (c === "NZ") return { ...DEFAULT_UNITS, currency: "NZD" };
  if (EUROZONE.includes(c)) return { ...DEFAULT_UNITS, currency: "EUR" };
  return DEFAULT_UNITS;
}

/** Country from a request: Vercel's geo header first, then the browser language (e.g. en-US). */
export function countryFromHeaders(h: Headers | null | undefined) {
  const geo = h?.get("x-vercel-ip-country");
  if (geo) return geo;
  const lang = h?.get("accept-language")?.split(",")[0] ?? "";
  return lang.split("-")[1] ?? null;
}

/** Narrow whatever is stored on the user row into valid prefs. */
export function unitPrefsOf(u: Partial<Record<keyof UnitPrefs, unknown>> | null | undefined): UnitPrefs {
  const pick = <T extends string>(v: unknown, ok: readonly { id: T }[], d: T) => (ok.some((o) => o.id === v) ? (v as T) : d);
  return {
    distanceUnit: pick(u?.distanceUnit, DISTANCE_UNITS, DEFAULT_UNITS.distanceUnit),
    volumeUnit: pick(u?.volumeUnit, VOLUME_UNITS, DEFAULT_UNITS.volumeUnit),
    economyUnit: pick(u?.economyUnit, ECONOMY_UNITS, DEFAULT_UNITS.economyUnit),
    currency: pick(u?.currency, CURRENCIES, DEFAULT_UNITS.currency),
  };
}

/* ---------------- conversions (user units <-> stored metric) ---------------- */

const econToUser = (l100: number, e: EconomyUnit) =>
  e === "l100" ? l100 : e === "kml" ? 100 / l100 : e === "mpg" ? 235.214583 / l100 : 282.480936 / l100;
const econFromUser = (v: number, e: EconomyUnit) =>
  e === "l100" ? v : e === "kml" ? 100 / v : e === "mpg" ? 235.214583 / v : 282.480936 / v;

/** Server-side: convert values typed by the user into stored metric values. */
export function toMetric(p: UnitPrefs) {
  const k = p.distanceUnit === "mi" ? KM_PER_MI : 1;
  const l = L_PER[p.volumeUnit];
  return {
    /** odometers and distances, rounded to whole km */
    dist: (v: number | null) => (v == null ? null : Math.round(v * k)),
    vol: (v: number | null) => (v == null ? null : v * l),
    /** price per user volume unit -> price per litre */
    perVol: (v: number | null) => (v == null ? null : v / l),
    econ: (v: number) => econFromUser(v, p.economyUnit),
  };
}

/* ---------------- display ---------------- */

export type Fmt = ReturnType<typeof makeFmt>;

export function makeFmt(prefs: UnitPrefs) {
  const p = unitPrefsOf(prefs);
  const locale = CURRENCIES.find((c) => c.id === p.currency)?.locale ?? "en-CA";
  const cur = new Intl.NumberFormat(locale, { style: "currency", currency: p.currency });
  const curShort = new Intl.NumberFormat(locale, { style: "currency", currency: p.currency, maximumFractionDigits: 0 });
  const curFine = (d: number) => new Intl.NumberFormat(locale, { style: "currency", currency: p.currency, minimumFractionDigits: d, maximumFractionDigits: d });
  const num = (n: number | null | undefined, digits = 0) => new Intl.NumberFormat("en-CA", { maximumFractionDigits: digits }).format(n ?? 0);
  const symbol = cur.formatToParts(0).find((x) => x.type === "currency")?.value ?? "$";
  const mi = p.distanceUnit === "mi";
  const k = mi ? KM_PER_MI : 1;
  const l = L_PER[p.volumeUnit];
  const dUnit = p.distanceUnit;
  const vUnit = p.volumeUnit === "L" ? "L" : p.volumeUnit === "gal" ? "gal" : "UK gal";
  const eUnit = ECONOMY_UNITS.find((e) => e.id === p.economyUnit)!.label;

  return {
    prefs: p,
    num,
    /* money (cents) */
    money: (cents: number | null | undefined) => cur.format((cents ?? 0) / 100),
    moneyShort: (cents: number | null | undefined) => curShort.format((cents ?? 0) / 100),
    /** a unit price in dollars, e.g. $1.459 */
    price: (dollars: number, digits = 3) => curFine(digits).format(dollars),
    symbol,
    /** money typed in a form: "Total paid ($)" / "(£)" */
    moneyLabel: (label: string) => `${label} (${symbol})`,

    /* distance (stored km) */
    distUnit: dUnit,
    distWord: mi ? "miles" : "kilometres",
    distToUser: (km: number | null | undefined) => (km == null ? null : km / k),
    /** "123,456 km" / "76,712 mi" */
    dist: (km: number | null | undefined) => (km == null ? "—" : `${num(Math.round(km / k))} ${dUnit}`),
    /** a whole-number input value for an odometer / distance field */
    distInput: (km: number | null | undefined) => (km == null ? "" : String(Math.round(km / k))),

    /* volume (stored litres) */
    volUnit: vUnit,
    volWord: p.volumeUnit === "L" ? "Litres" : p.volumeUnit === "gal" ? "Gallons" : "Gallons (UK)",
    vol: (litres: number | null | undefined, digits = 2) => (litres == null ? "—" : num(litres / l, digits)),
    volInput: (litres: number | null | undefined) => (litres == null ? "" : String(Math.round((litres / l) * 1000) / 1000)),
    /** stored $ per litre -> $ per user volume */
    perVolToUser: (perLitre: number | null | undefined) => (perLitre == null ? null : perLitre * l),
    perVolInput: (perLitre: number | null | undefined) => (perLitre == null ? "" : String(Math.round(perLitre * l * 1000) / 1000)),
    perVolLabel: `${symbol}/${vUnit}`,

    /* fuel economy (stored L/100 km) */
    econUnit: eUnit,
    econToUser: (l100: number) => econToUser(l100, p.economyUnit),
    econ: (l100: number | null | undefined) => (l100 == null || !(l100 > 0) ? "—" : `${econToUser(l100, p.economyUnit).toFixed(1)} ${eUnit}`),
    econInput: (l100: number) => String(Math.round(econToUser(l100, p.economyUnit) * 10) / 10),

    /* EV efficiency (stored kWh per 100 km): kWh/100 km, or mi/kWh for miles */
    evEffUnit: mi ? "mi/kWh" : "kWh/100 km",
    evEffValue: (kwhPer100km: number | null | undefined) =>
      kwhPer100km == null || !(kwhPer100km > 0) ? "—" : mi ? (100 / kwhPer100km / KM_PER_MI).toFixed(2) : kwhPer100km.toFixed(1),

    /** cost per distance: input cents per km -> "$0.123" per km or per mile */
    perDist: (centsPerKm: number | null | undefined, digits?: number) => {
      if (centsPerKm == null) return "—";
      const v = (centsPerKm * k) / 100;
      return curFine(digits ?? (v < 0.1 ? 3 : 2)).format(v);
    },
    perDistWord: mi ? "per mile" : "per km",
  };
}
