import { NextResponse } from "next/server";
import { checkDigitOk, decodeVinLocally, normalizeVin, usesCheckDigit, VIN_RE } from "@/lib/vin";
import { getSession } from "@/server/session";

type Nhtsa = { year?: string; make?: string; model?: string; trim?: string; powertrain?: string };

/** NHTSA's free vPIC database (US-market vehicles). Returns {} if it's down or has nothing. */
async function lookupNhtsa(vin: string): Promise<Nhtsa> {
  try {
    const r = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`, {
      next: { revalidate: 60 * 60 * 24 * 30 },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return {};
    const row = (await r.json())?.Results?.[0] ?? {};
    const t = (s: unknown) => (typeof s === "string" && s.trim() ? s.trim() : undefined);
    const title = (s?: string) => s && s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    const elec = (t(row.ElectrificationLevel) ?? "").toUpperCase();
    const fuel = (t(row.FuelTypePrimary) ?? "").toLowerCase();
    const powertrain = elec.startsWith("BEV")
      ? "ev"
      : elec.startsWith("PHEV")
        ? "phev"
        : elec.includes("HEV")
          ? "hybrid"
          : fuel === "electric"
            ? "ev"
            : fuel.includes("diesel")
              ? "diesel"
              : fuel
                ? "gas"
                : undefined;
    return { year: t(row.ModelYear), make: title(t(row.Make)), model: t(row.Model), trim: t(row.Trim) ?? t(row.Series), powertrain };
  } catch {
    return {}; // timeout or network error: fall back to the offline decode
  }
}

/**
 * VIN → year / make / model / trim. Signed-in users only, so it can't be used as an open proxy.
 * NHTSA first (most detail, US-market vehicles), then the international VIN standard for
 * anything it doesn't know (e.g. Teslas built in Shanghai or Berlin for Canada).
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/vin/[vin]">) {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const vin = normalizeVin((await ctx.params).vin);
  if (!VIN_RE.test(vin))
    return NextResponse.json({ error: "A VIN is 17 letters and numbers (never I, O or Q)." }, { status: 400 });

  const n = await lookupNhtsa(vin);
  const local = decodeVinLocally(vin);
  const fromNhtsa = !!(n.make || n.model);
  return NextResponse.json({
    year: n.year ?? (local.year ? String(local.year) : undefined),
    make: n.make ?? local.make ?? undefined,
    model: n.model ?? local.model ?? undefined,
    trim: n.trim,
    powertrain: n.powertrain ?? local.powertrain ?? undefined,
    country: local.country ?? undefined,
    /** true when only the basics could be read (vehicle not in NHTSA's US database) */
    partial: !fromNhtsa,
    /** North American VINs have a check digit; a mismatch usually means a typo */
    checkDigitWarning: usesCheckDigit(vin) && !checkDigitOk(vin),
  });
}
