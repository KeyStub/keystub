import Link from "next/link";
import { CategoryBars } from "@/components/charts";
import { QuickFuel } from "@/components/quick-fuel";
import { StatTile, StatusChip } from "@/components/ui";
import { allDated, fuelEconomySeries, kmRecorded, monthsSince, sumInRange, totalsByCategory } from "@/lib/calc";
import { fmtDate, money, moneyShort, numFmt } from "@/lib/format";
import { getVehicleBundle } from "@/server/data";
import { collectReminders } from "@/server/reminders";
import { requireUser } from "@/server/session";
import { serverToday } from "@/server/today";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({ params }: PageProps<"/app/v/[vid]">) {
  const user = await requireUser();
  const { vid } = await params;
  const b = await getVehicleBundle(user.id, vid);
  const today = await serverToday();

  const rows = allDated(b.fuel, b.maintenance, b.costs);
  const totals = totalsByCategory(rows);
  const ownership = totals.Fuel + totals.Maintenance + totals.Insurance + totals.Other;
  const purchase = b.vehicle.purchasePriceCents ?? 0;
  const monthSpend = sumInRange(rows, today.slice(0, 7) + "-01", today);
  const ytd = sumInRange(rows, today.slice(0, 4) + "-01-01", today);
  const earliest = rows.reduce<string | null>((m, r) => (!m || r.date < m ? r.date : m), null);
  const avgMonthly = earliest ? ownership / monthsSince(earliest, today) : 0;
  const km = kmRecorded(b.fuel, b.maintenance, b.vehicle.currentOdometer);  const costPerKm = km ? ownership / km : null; // cents per km
  const economy = fuelEconomySeries(b.fuel);
  const lastEco = economy.at(-1);
  const recent = [...rows].sort((a, c) => c.date.localeCompare(a.date)).slice(0, 8);
  const reminders = collectReminders(b, today, { leadDays: user.reminderLeadDays, leadKm: user.reminderLeadKm }).slice(0, 6);
  const flagged = [...b.fuel, ...b.maintenance, ...b.costs].filter((r) => r.reviewFlag).length;

  return (
    <>
      {flagged > 0 && (
        <div className="note" style={{ marginBottom: 16 }}>
          ⚑ {flagged} record{flagged === 1 ? "" : "s"} flagged for review during import.{" "}
          <Link href={`/app/v/${vid}/fuel`}>Review them</Link> — use “Needs review” on the Fuel tab.
        </div>
      )}
      <div className="grid stat-row">
        <StatTile label="This month" value={moneyShort(monthSpend)} sub="all categories" />
        <StatTile label="Year to date" value={moneyShort(ytd)} sub={today.slice(0, 4)} />
        <StatTile label="Total ownership cost" value={moneyShort(ownership)} sub="fuel + maintenance + recurring" />
        <StatTile label="Avg. monthly cost" value={moneyShort(avgMonthly)} sub={earliest ? `since ${fmtDate(earliest)}` : "—"} />
        <StatTile
          label="Cost per km"
          value={costPerKm != null ? `$${(costPerKm / 100).toFixed(2)}` : "—"}
          sub={km ? `${numFmt(km)} km recorded` : "need 2+ odometer readings"}
        />
        <StatTile label="Total + vehicle" value={moneyShort(ownership + purchase)} sub={purchase ? `incl. ${moneyShort(purchase)} purchase` : "add purchase price"} />
      </div>

      <div className="two-col" style={{ marginTop: 20 }}>
        <div>
          <h3 className="section-title">Spending breakdown</h3>
          <div className="card">
            <CategoryBars totals={totals} />
          </div>
          <h3 className="section-title">Recent activity</h3>
          <div className="card">
            {recent.length === 0 ? (
              <p className="muted">No records yet.</p>
            ) : (
              <div className="list">
                {recent.map((r, i) => (
                  <div className="list-item" key={i}>
                    <div className="l-main">
                      <div className="l-title">{r.cat}</div>
                      <div className="l-sub">{fmtDate(r.date)}</div>
                    </div>
                    <div className="l-val tabular">{money(r.cents)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div>
          <h3 className="section-title">Quick fill-up</h3>
          <QuickFuel vehicleId={vid} lastStation={b.fuel.find((f) => f.station)?.station ?? null} />

          <h3 className="section-title">Reminders</h3>
          <div className="card">
            {reminders.length === 0 ? (
              <p className="muted">
                No reminders set. <Link href={`/app/v/${vid}/reminders`}>Add one</Link>.
              </p>
            ) : (
              <div className="list">
                {reminders.map((r) => (
                  <div className="list-item" key={r.id}>
                    <div className="l-main">
                      <div className="l-title">{r.title}</div>
                      <div className="l-sub">{r.dueDate ? fmtDate(r.dueDate) : r.dueOdometer != null ? `${numFmt(r.dueOdometer)} km` : "—"}</div>
                    </div>
                    <StatusChip status={r.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <h3 className="section-title">Fuel economy</h3>
          <div className="card">
            {lastEco ? (
              <>
                <div style={{ fontSize: 26, fontWeight: 700 }} className="tabular">
                  {lastEco.l100.toFixed(1)} L/100 km
                </div>
                <p className="muted" style={{ fontSize: 12.5, margin: "6px 0 0" }}>
                  Last full-to-full fill ({numFmt(lastEco.dist)} km, {fmtDate(lastEco.date)})
                </p>
              </>
            ) : (
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                Log two full-tank fill-ups with odometer and litres to see your real-world fuel economy.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
