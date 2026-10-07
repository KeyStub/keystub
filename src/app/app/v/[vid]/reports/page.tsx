import Link from "next/link";
import { ReportsView } from "@/components/reports-view";
import { allDated, monthsSince, totalsByCategory } from "@/lib/calc";
import { vehicleName } from "@/lib/format";
import { getVehicleBundle } from "@/server/data";
import { requireUser } from "@/server/session";
import { serverToday } from "@/server/today";

export const metadata = { title: "Reports" };

export default async function ReportsPage({ params }: PageProps<"/app/v/[vid]/reports">) {
  const user = await requireUser();
  const { vid } = await params;
  const b = await getVehicleBundle(user.id, vid);
  const today = await serverToday();
  const rows = allDated(b.fuel, b.maintenance, b.costs);
  const t = totalsByCategory(rows);
  const ownership = t.Fuel + t.Maintenance + t.Insurance + t.Other;
  const earliest = rows.reduce<string | null>((m, r) => (!m || r.date < m ? r.date : m), null);
  const currentMonthly = earliest ? ownership / monthsSince(earliest, today) : 0;
  return (
    <>
      <ReportsView rows={rows} today={today} currentMonthly={currentMonthly} vehicleLabel={vehicleName(b.vehicle)} />
      <h3 className="section-title no-print">Service history report</h3>
      <div className="card no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <p className="muted" style={{ margin: 0, fontSize: 13.5, maxWidth: 560 }}>
          A clean, printable maintenance history, handy when you sell the vehicle. Buyers pay more for a documented car.
          {user.effectivePlan !== "pro" && " (Pro feature)"}
        </p>
        <Link className="btn" href={`/app/v/${vid}/history`}>
          Open printable report
        </Link>
      </div>
    </>
  );
}
