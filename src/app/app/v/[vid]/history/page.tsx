import Link from "next/link";
import { HistoryOptions } from "@/components/customize";
import { PrintButton } from "@/components/print-button";
import { fmtDate, numFmt, vehicleName } from "@/lib/format";
import { makeFmt } from "@/lib/units";
import { getPrefs, getVehicleBundle } from "@/server/data";
import { requireUser } from "@/server/session";
import { serverToday } from "@/server/today";

export const metadata = { title: "Maintenance history" };

/**
 * A clean maintenance history to print, save as PDF or send: for a buyer when selling, or a new
 * shop that wants to know what's been done. Columns and date range are chosen by the owner.
 */
export default async function HistoryPage({ params, searchParams }: PageProps<"/app/v/[vid]/history">) {
  const user = await requireUser();
  const u = makeFmt(user.units);
  const { vid } = await params;
  const sp = await searchParams;
  if (user.effectivePlan !== "pro")
    return (
      <div className="card" style={{ padding: 28, textAlign: "center" }}>
        <h2 style={{ marginTop: 0 }}>The maintenance history report is a Pro feature</h2>
        <p className="muted">A clean record of every service and repair to print or send: handy when you sell, visit a new shop, or make a warranty claim.</p>
        <Link href="/app/account/plan" className="btn primary">
          See Pro
        </Link>
      </div>
    );
  const b = await getVehicleBundle(user.id, vid);
  const { history } = await getPrefs(user.id);
  const show = new Set(history.show);
  const v = b.vehicle;
  const from = typeof sp.from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.from) ? sp.from : "";
  const to = typeof sp.to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.to) ? sp.to : "";
  const records = [...b.maintenance]
    .filter((r) => (show.has("washes") || r.category !== "Car Wash") && (!from || r.date >= from) && (!to || r.date <= to))
    .sort((a, c) => a.date.localeCompare(c.date));
  const total = records.reduce((s, r) => s + r.totalCostCents, 0);
  const full = [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ");
  const csv = new URLSearchParams({ format: "csv", vehicle: vid, cats: "Maintenance", ...(from ? { from } : {}), ...(to ? { to } : {}) });
  const cols = 2 + (show.has("odometer") ? 1 : 0) + (show.has("shop") ? 1 : 0);

  return (
    <article className="print-solo">
      <div className="toolbar">
        <form className="history-range no-print" action="">
          <label>
            From <input className="input" type="date" name="from" defaultValue={from} />
          </label>
          <label>
            To <input className="input" type="date" name="to" defaultValue={to} />
          </label>
          <button className="btn sm">Apply</button>
          {(from || to) && (
            <Link href={`/app/v/${vid}/history`} className="btn sm ghost">
              All dates
            </Link>
          )}
        </form>
        <div className="grow" />
        <a className="btn" href={`/api/export?${csv}`}>
          Spreadsheet
        </a>
        <PrintButton />
      </div>
      <HistoryOptions show={history.show} />
      <div className="card" style={{ padding: 24, marginTop: 12 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Maintenance history</h1>
        <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{v.nickname && full ? `${full} (${v.nickname})` : vehicleName(v)}</div>
        <p className="muted" style={{ margin: "6px 0 0", fontSize: 13 }}>
          {[
            v.vin ? `VIN ${v.vin}` : null,
            v.currentOdometer != null && show.has("odometer") ? `Odometer ${u.dist(v.currentOdometer)}` : null,
            from || to ? `${from ? fmtDate(from) : "Start"} to ${to ? fmtDate(to) : "today"}` : "Full history",
            `Generated ${fmtDate(await serverToday())}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {records.length === 0 ? (
          <p className="muted" style={{ marginTop: 20 }}>
            No maintenance records {from || to ? "in this date range" : "yet"}.
          </p>
        ) : (
          <table className="data" style={{ marginTop: 20 }}>
            <thead>
              <tr>
                <th>Date</th>
                {show.has("odometer") && <th className="num">Odometer ({u.distUnit})</th>}
                <th>Work done</th>
                {show.has("shop") && <th>Shop</th>}
                {show.has("costs") && <th className="num">Cost</th>}
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{fmtDate(r.date)}</td>
                  {show.has("odometer") && <td className="num tabular">{r.odometer != null ? numFmt(u.distToUser(r.odometer)!) : "—"}</td>}
                  <td>
                    {r.category && <b>{r.category}: </b>}
                    {r.description?.startsWith("(migrated") ? <span className="muted">details not recorded</span> : r.description || "—"}
                    {show.has("refs") && r.receiptRef && (
                      <div className="muted" style={{ fontSize: 12 }}>
                        Ref: {r.receiptRef}
                      </div>
                    )}
                    {show.has("notes") && (r.warrantyInfo || r.notes) && (
                      <div className="muted" style={{ fontSize: 12 }}>
                        {[r.warrantyInfo ? `Warranty: ${r.warrantyInfo}` : null, r.notes].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </td>
                  {show.has("shop") && <td>{r.shop || "—"}</td>}
                  {show.has("costs") && <td className="num tabular">{u.money(r.totalCostCents)}</td>}
                </tr>
              ))}
              <tr>
                <td colSpan={cols} style={{ fontWeight: 700 }}>
                  {records.length} record{records.length === 1 ? "" : "s"}
                </td>
                {show.has("costs") && (
                  <td className="num tabular" style={{ fontWeight: 700 }}>
                    {u.money(total)}
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        )}
        <p className="muted" style={{ fontSize: 11.5, marginTop: 16 }}>
          Recorded by the owner in KeyStub (keystub.com).
        </p>
      </div>
    </article>
  );
}
