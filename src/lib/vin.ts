/**
 * Offline VIN decoding from the international standard (ISO 3779), used when NHTSA's US
 * database has nothing (vehicles built for Canada, Europe or Asia, e.g. Shanghai-built
 * Teslas starting "LRW"). It can always tell the model year; the manufacturer comes from a
 * table of well-known WMIs (first 3 characters), listed only where the code is unambiguous.
 */

export const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;

export const normalizeVin = (v: string) => v.trim().toUpperCase().replace(/[\s-]/g, "");

const TRANSLIT: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
};
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

/** North American VINs (first character 1–5) carry a check digit in position 9. */
export const usesCheckDigit = (vin: string) => /^[1-5]/.test(vin);

export function checkDigitOk(vin: string) {
  if (!VIN_RE.test(vin)) return false;
  const sum = [...vin].reduce((s, ch, i) => s + (/\d/.test(ch) ? Number(ch) : TRANSLIT[ch] ?? 0) * WEIGHTS[i], 0);
  const r = sum % 11;
  return vin[8] === (r === 10 ? "X" : String(r));
}

const YEAR_CODES = "ABCDEFGHJKLMNPRSTVWXY123456789"; // A = 1980 / 2010, ..., 9 = 2009 / 2039

/** Model year from position 10. For North American VINs, a letter in position 7 means 2010 or later. */
export function modelYear(vin: string, now = new Date().getFullYear()): number | null {
  const idx = YEAR_CODES.indexOf(vin[9]);
  if (idx < 0) return null;
  const early = 1980 + idx;
  const late = early + 30;
  if (usesCheckDigit(vin)) return /[A-Z]/.test(vin[6]) ? late : early;
  // Elsewhere position 7 has no fixed meaning: take the most recent year that isn't in the future.
  return late <= now + 1 ? late : early;
}

const WMI: [string[], string][] = [
  [["5YJ", "7SA", "LRW", "XP7", "SFZ", "7G2"], "Tesla"],
  [["JTD", "JTE", "JTK", "JTL", "JTM", "JTN", "JT2", "JT3", "2T1", "2T3", "4T1", "4T3", "4T4", "5TD", "5TF", "5TE"], "Toyota"],
  [["JTH", "JTJ", "2T2", "58A"], "Lexus"],
  [["JHM", "1HG", "2HG", "5FN", "5J6", "19X", "2HK", "7FA", "SHH", "SHS"], "Honda"],
  [["JH4", "19U", "5J8"], "Acura"],
  [["JN1", "JN8", "1N4", "1N6", "3N1", "3N6", "5N1"], "Nissan"],
  [["JNK", "JNR", "5N3"], "Infiniti"],
  [["KMH", "5NP", "5NM", "KM8"], "Hyundai"],
  [["KMT"], "Genesis"],
  [["KNA", "KND"], "Kia"],
  [["JM1", "JM3", "3MZ", "3MV"], "Mazda"],
  [["JF1", "JF2", "4S3", "4S4"], "Subaru"],
  [["JA3", "JA4", "ML3"], "Mitsubishi"],
  [["WVW", "WVG", "3VW", "1VW"], "Volkswagen"],
  [["WAU", "WA1"], "Audi"],
  [["WP0", "WP1"], "Porsche"],
  [["WBA", "WBS", "WBX", "WBY", "5UX", "5YM"], "BMW"],
  [["WMW"], "MINI"],
  [["WDD", "WDC", "WDB", "W1K", "W1N", "4JG", "55S"], "Mercedes-Benz"],
  [["YV1", "YV4", "7JR"], "Volvo"],
  [["SAJ"], "Jaguar"],
  [["SAL"], "Land Rover"],
  [["1FA", "1FB", "1FC", "1FD", "1FM", "1FT", "2FA", "2FM", "2FT", "3FA", "3FM", "3FT", "NM0"], "Ford"],
  [["1LN", "2LM", "3LN", "5LM"], "Lincoln"],
  [["1G1", "2G1", "3G1", "1GC", "3GC", "1GN", "3GN"], "Chevrolet"],
  [["1GT", "2GT", "3GT", "1GK", "1GD"], "GMC"],
  [["1G6", "1GY"], "Cadillac"],
  [["1G4"], "Buick"],
  [["1J4", "1J8"], "Jeep"],
  [["1C6", "3C6"], "Ram"],
  [["ZFF"], "Ferrari"],
  [["ZHW"], "Lamborghini"],
  [["ZAM"], "Maserati"],
  [["ZAR"], "Alfa Romeo"],
];
const WMI_MAP = new Map(WMI.flatMap(([codes, make]) => codes.map((c) => [c, make] as const)));

export const makeFromWmi = (vin: string) => WMI_MAP.get(vin.slice(0, 3)) ?? null;

const TESLA_MODELS: Record<string, string> = { S: "Model S", "3": "Model 3", X: "Model X", Y: "Model Y", C: "Cybertruck" };
/** Tesla factory, from position 11. */
const TESLA_PLANTS: Record<string, string> = { F: "Fremont, USA", A: "Austin, USA", C: "Shanghai, China", B: "Berlin, Germany" };

const COUNTRY: [RegExp, string][] = [
  [/^[145]/, "United States"],
  [/^2/, "Canada"],
  [/^3/, "Mexico"],
  [/^J/, "Japan"],
  [/^K[L-R]/, "South Korea"],
  [/^L/, "China"],
  [/^S[A-M]/, "United Kingdom"],
  [/^W/, "Germany"],
  [/^XP/, "Germany"],
  [/^Y[S-W]/, "Sweden"],
  [/^Z/, "Italy"],
];

export type LocalVinDecode = {
  year: number | null;
  make: string | null;
  model: string | null;
  country: string | null;
  /** factory, where the VIN reliably says (Teslas) */
  plant: string | null;
  powertrain: "ev" | null;
};

export function decodeVinLocally(vin: string): LocalVinDecode {
  const make = makeFromWmi(vin);
  const tesla = make === "Tesla";
  return {
    year: modelYear(vin),
    make,
    model: tesla ? (TESLA_MODELS[vin[3]] ?? null) : null,
    country: COUNTRY.find(([re]) => re.test(vin))?.[1] ?? null,
    plant: tesla ? (TESLA_PLANTS[vin[10]] ?? null) : null,
    powertrain: tesla ? "ev" : null,
  };
}
