import { NextResponse } from "next/server";
import { getSession } from "@/server/session";

/**
 * VIN → year/make/model/trim via NHTSA's free vPIC API (no key needed). Signed-in users only, so
 * the endpoint can't be used as an open proxy. Covers vehicles sold in North America.
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/vin/[vin]">) {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { vin } = await ctx.params;
  if (!/^[A-HJ-NPR-Z0-9]{17}$/i.test(vin)) return NextResponse.json({ error: "Invalid VIN" }, { status: 400 });
  const r = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${vin}?format=json`, {
    next: { revalidate: 60 * 60 * 24 * 30 },
  });
  if (!r.ok) return NextResponse.json({ error: "Lookup failed" }, { status: 502 });
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
  return NextResponse.json({
    powertrain,
    year: t(row.ModelYear),
    make: title(t(row.Make)),
    model: t(row.Model),
    trim: t(row.Trim) ?? t(row.Series),
  });
}
