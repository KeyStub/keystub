import Link from "next/link";
import { PrintButton } from "@/components/print-button";
import { fmtDate, numFmt, vehicleName } from "@/lib/format";
import { makeFmt } from "@/lib/units";
import { getVehicleBundle } from "@/server/data";
import { requireUser } from "@/server/session";
import { serverToday } from "@/server/today";

export const metadata = { title: "Service history" };

export default async function HistoryPage({ params }: PageProps<"/app/v/[vid]/history">) {
  const user = await requireUser();
  const u = makeFmt(user.units);
  const { vid } = await params;
  if (user.effectivePlan !== "pro")
    return (
      <div className="card" style={{ padding: 28, textAlign: "center" }}>
        <h2 style={{ marginTop: 0 }}>Printable service history is a Pro feature</h2>
        <p className="muted">A clean report of every service and repair — useful when you sell, or for warranty claims.</p>
        <Link href="/app/account#plan" className="btn primary">
          See Pro
        </Link>
      </div>
    );
  const b = await getVehicleBundle(user.id, vid);
  const v = b.vehicle;
  const records = [...b.maintenance].filter((r) => r.category !== "Car Wash").sort((a, c) => a.date.localeCompare(c.date));
  const total = records.reduce((s, r) => s + r.totalCostCents, 0);
  return (
    <article>
      <div className="toolbar">
        <div className="grow" />
        <PrintButton />
      </div>
      <div className="card" style={{ padding: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Service history — {vehicleName(v)}</h1>
        <p className="muted" style={{ margin: "6px 0 0", fontSize: 13 }}>
          {[v.vin ? `VIN ${v.vin}` : null, v.currentOdometer != null ? u.dist(v.currentOdometer) : null, `Generated ${fmtDate(await serverToday())}`]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <table className="data" style={{ marginTop: 20 }}>
          <thead>
            <tr>
              <th>Date</th>
              <th className="num">Odometer ({u.distUnit})</th>
              <th>Work done</th>
              <th>Shop</th>
              <th className="num">Cost</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td style={{ whiteSpace: "nowrap" }}>{fmtDate(r.date)}</td>
                <td className="num tabular">{r.odometer != null ? numFmt(u.distToUser(r.odometer)!) : "—"}</td>
                <td>
                  {r.category && <b>{r.category}: </b>}
                  {r.description?.startsWith("(migrated") ? <span className="muted">details not recorded</span> : r.description || "—"}
                  {r.receiptRef && <div className="muted" style={{ fontSize: 12 }}>Ref: {r.receiptRef}</div>}
                </td>
                <td>{r.shop || "—"}</td>
                <td className="num tabular">{u.money(r.totalCostCents)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={4} style={{ fontWeight: 700 }}>
                {records.length} records
              </td>
              <td className="num tabular" style={{ fontWeight: 700 }}>
                {u.money(total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  );
}
