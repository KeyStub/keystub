import Link from "next/link";
import { ReportsView } from "@/components/reports-view";
import { allDated, monthsSince, totalsByCategory } from "@/lib/calc";
import { vehicleName } from "@/lib/format";
import { getPrefs, getVehicleBundle } from "@/server/data";
import type { ReportRecord } from "@/components/reports-view";
import { CREDIT_TYPES } from "@/lib/calc";
import { requireUser } from "@/server/session";
import { serverToday } from "@/server/today";

export const metadata = { title: "Reports" };

export default async function ReportsPage({ params }: PageProps<"/app/v/[vid]/reports">) {
  const user = await requireUser();
  const { vid } = await params;
  const b = await getVehicleBundle(user.id, vid);
  const today = await serverToday();
  const rows = allDated(b.fuel, b.maintenance, b.costs, b.charges);
  const t = totalsByCategory(rows);
  const ownership = t.Fuel + t.Charging + t.Maintenance + t.Insurance + t.Other;
  const { reports } = await getPrefs(user.id);
  const records: ReportRecord[] = [
    ...b.fuel.map((r) => ({ date: r.date, cat: "Fuel" as const, title: ["Fill-up", r.station, r.grade].filter(Boolean).join(" · "), cents: r.totalPaidCents })),
    ...b.charges.map((r) => ({ date: r.date, cat: "Charging" as const, title: ["Charge", r.network || r.location, `${r.kwh} kWh`].filter(Boolean).join(" · "), cents: r.costCents })),
    ...b.maintenance.map((r) => ({
      date: r.date,
      cat: "Maintenance" as const,
      title: [r.category, r.description?.startsWith("(migrated") ? null : r.description, r.shop].filter(Boolean).join(" · ") || "Maintenance",
      cents: r.totalCostCents,
    })),
    ...b.costs.map((r) => ({
      date: r.date,
      cat: r.type === "Insurance" ? ("Insurance" as const) : ("Other" as const),
      title: [r.type, r.provider].filter(Boolean).join(" · "),
      cents: CREDIT_TYPES.includes(r.type) ? -r.amountCents : r.amountCents,
    })),
  ];
  const earliest = rows.reduce<string | null>((m, r) => (!m || r.date < m ? r.date : m), null);
  const currentMonthly = earliest ? ownership / monthsSince(earliest, today) : 0;
  return (
    <>
      <ReportsView rows={rows} records={records} today={today} currentMonthly={currentMonthly} vehicleLabel={vehicleName(b.vehicle)} vehicleId={vid} prefs={reports} />
      <h3 className="section-title no-print">Maintenance history</h3>
      <div className="card no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <p className="muted" style={{ margin: 0, fontSize: 13.5, maxWidth: 560 }}>
          Just the maintenance and repairs, ready to print, save as a PDF or send: for a buyer when you sell, or a new shop that wants to know what&apos;s been done.
          {user.effectivePlan !== "pro" && " (Pro feature)"}
        </p>
        <Link className="btn" href={`/app/v/${vid}/history`}>
          Open maintenance history
        </Link>
      </div>
    </>
  );
}
