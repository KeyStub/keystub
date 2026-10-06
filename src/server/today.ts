import "server-only";
import { cookies } from "next/headers";

/**
 * Today's date (YYYY-MM-DD) in the viewer's time zone. The browser stores its zone in a `tz`
 * cookie (see UIProvider); servers usually run in UTC, which would flip "today" in the evening.
 */
export async function serverToday() {
  const tz = (await cookies()).get("tz")?.value;
  const zone = tz && /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)*$/.test(tz) ? tz : "America/Edmonton";
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}
