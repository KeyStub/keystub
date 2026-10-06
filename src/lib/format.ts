/** Display formatting. Money inputs are integer cents. */

const cad = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });
const cadShort = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });

export const money = (cents: number | null | undefined) => cad.format((cents ?? 0) / 100);
export const moneyShort = (cents: number | null | undefined) => cadShort.format((cents ?? 0) / 100);
export const numFmt = (n: number | null | undefined, digits = 0) =>
  new Intl.NumberFormat("en-CA", { maximumFractionDigits: digits }).format(n ?? 0);

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso.slice(0, 10) + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "short", day: "numeric" }).format(d);
}

/** Today's date (YYYY-MM-DD) in the user's local time zone when run in the browser. */
export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const centsToInput = (c: number | null | undefined) => (c == null ? "" : (c / 100).toFixed(2));

export function vehicleName(v: { nickname?: string | null; year?: number | null; make?: string | null; model?: string | null; trim?: string | null }) {
  const full = [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ");
  return v.nickname || full || "Unnamed vehicle";
}
