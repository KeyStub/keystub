import { NextResponse } from "next/server";
import { exportAllForUser } from "@/server/data";
import { makeFmt, unitPrefsOf } from "@/lib/units";
import { getSession } from "@/server/session";

/** "Download all my data" — JSON (complete, re-importable by you or any tool) or CSV (spreadsheet). */
export async function GET(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const format = new URL(req.url).searchParams.get("format") === "csv" ? "csv" : "json";
  const data = await exportAllForUser(s.user.id);
  const stamp = new Date().toISOString().slice(0, 10);
  const units = unitPrefsOf(s.user);

  if (format === "json") {
    const body = JSON.stringify({
        format: "car-cost-tracker",
        version: 1,
        exportedAt: new Date().toISOString(),
        account: { email: s.user.email },
        // Backups are always metric so they restore the same way for everyone.
        units: { distance: "km", volume: "litres", fuelPrice: "per litre", money: "cents", currency: units.currency, displayPrefs: units },
        ...data,
      }, null, 2);
    return new Response(body, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="keystub-backup-${stamp}.json"`,
        "cache-control": "no-store",
      },
    });
  }

  const names = new Map(data.vehicles.map((v) => [v.id, [v.year, v.make, v.model].filter(Boolean).join(" ") || v.nickname || v.id]));
  const esc = (v: unknown) => {
    if (v == null) return "";
    let s = String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // neutralize spreadsheet formula injection
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const dollars = (c: number | null) => (c == null ? "" : (c / 100).toFixed(2));
  // Spreadsheet in the user's own units (the JSON backup stays metric).
  const u = makeFmt(units);
  const odo = (km: number | null) => (km == null ? "" : Math.round(u.distToUser(km)!));
  const vol = (l: number | null) => (l == null ? "" : u.volInput(l));
  const ppv = (p: number | null) => (p == null ? "" : u.perVolInput(p));
  const rows: unknown[][] = [
    ["Vehicle", "Category", "Type", "Date", "Description", `Amount (${units.currency})`, `Odometer (${u.distUnit})`, u.volWord, `Price/${u.volUnit}`, "kWh", "Price/kWh", "Notes"],
  ];
  data.fuel.forEach((r) => rows.push([names.get(r.vehicleId), "Fuel", r.fillType, r.date, [r.station, r.grade].filter(Boolean).join(" "), dollars(r.totalPaidCents), odo(r.odometer), vol(r.litres), ppv(r.pricePerLitre), "", "", r.notes]));
  data.maintenance.forEach((r) => rows.push([names.get(r.vehicleId), "Maintenance", r.category, r.date, [r.description, r.shop].filter(Boolean).join(" — "), dollars(r.totalCostCents), odo(r.odometer), "", "", "", "", r.notes]));
  data.costs.forEach((r) => rows.push([names.get(r.vehicleId), "Recurring/Other", r.type, r.date, r.provider, dollars(r.amountCents), "", "", "", "", "", r.notes]));
  data.charging.forEach((r) => rows.push([names.get(r.vehicleId), "Charging", r.location, r.date, [r.network, r.costEstimated ? "(cost estimated from home rate)" : null].filter(Boolean).join(" "), dollars(r.costCents), odo(r.odometer), "", "", r.kwh, r.pricePerKwh?.toFixed(3), r.notes]));
  const header = rows.shift()!;
  rows.sort((a, b) => String(a[3]).localeCompare(String(b[3])));
  const csv = "﻿" + [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="keystub-${stamp}.csv"`,
      "cache-control": "no-store",
    },
  });
}
