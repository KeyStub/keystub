import Link from "next/link";
import { CategoryBars } from "@/components/charts";
import { QuickCharge } from "@/components/ev";
import { QuickFuel } from "@/components/quick-fuel";
import { StatTile, StatusChip } from "@/components/ui";
import {
  allDated,
  chargingStats,
  fuelEconomySeries,
  kmRecorded,
  monthsSince,
  sumInRange,
  totalsByCategory,
  usesCharging,
  usesFuel,
} from "@/lib/calc";
import { fmtDate, numFmt } from "@/lib/format";
import { makeFmt } from "@/lib/units";
import { getVehicleBundle } from "@/server/data";
import { collectReminders } from "@/server/reminders";
import { requireUser } from "@/server/session";
import { serverToday } from "@/server/today";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({
  params,
}: PageProps<"/app/v/[vid]">) {
  const user = await requireUser();
  const { vid } = await params;
  const b = await getVehicleBundle(user.id, vid);
  const u = makeFmt(user.units);
  const { money, moneyShort } = u;
  const today = await serverToday();

  const pt = b.vehicle.powertrain;
  const rows = allDated(b.fuel, b.maintenance, b.costs, b.charges);
  const totals = totalsByCategory(rows);
  const ownership =
    totals.Fuel +
    totals.Charging +
    totals.Maintenance +
    totals.Insurance +
    totals.Other;
  const purchase = b.vehicle.purchasePriceCents ?? 0;
  const monthSpend = sumInRange(rows, today.slice(0, 7) + "-01", today);
  const ytd = sumInRange(rows, today.slice(0, 4) + "-01-01", today);
  const earliest = rows.reduce<string | null>(
    (m, r) => (!m || r.date < m ? r.date : m),
    null,
  );
  const avgMonthly = earliest ? ownership / monthsSince(earliest, today) : 0;
  const km = kmRecorded(b.fuel, b.maintenance, b.vehicle.currentOdometer, [
    ...b.charges,
    ...b.battery,
  ]);
  const costPerKm = km ? ownership / km : null; // cents per km
  const economy = fuelEconomySeries(b.fuel);
  const lastEco = economy.at(-1);
  const recent = [...rows]
    .sort((a, c) => c.date.localeCompare(a.date))
    .slice(0, 8);
  const reminders = collectReminders(b, today, {
    leadDays: user.reminderLeadDays,
    leadKm: user.reminderLeadKm,
  }).slice(0, 6);
  const flagged = [
    ...b.fuel,
    ...b.maintenance,
    ...b.costs,
    ...b.charges,
  ].filter((r) => r.reviewFlag).length;
  const ev = usesCharging(pt)
    ? chargingStats(b.charges, {
        l100: user.compareL100,
        fuelPrice: user.compareFuelPrice,
      })
    : null;

  return (
    <>
      {flagged > 0 && (
        <div className="note" style={{ marginBottom: 16 }}>
          ⚑ {flagged} record{flagged === 1 ? "" : "s"} flagged for review during
          import. <Link href={`/app/v/${vid}/fuel`}>Review them</Link> — use
          “Needs review” on the Fuel tab.
        </div>
      )}
      <div className="grid stat-row">
        <StatTile
          label="This month"
          value={moneyShort(monthSpend)}
          sub="all categories"
        />
        <StatTile
          label="Year to date"
          value={moneyShort(ytd)}
          sub={today.slice(0, 4)}
        />
        <StatTile
          label="Total ownership cost"
          value={moneyShort(ownership)}
          sub={
            usesCharging(pt)
              ? usesFuel(pt)
                ? "fuel + charging + upkeep"
                : "charging + upkeep + recurring"
              : "fuel + maintenance + recurring"
          }
        />
        <StatTile
          label="Avg. monthly cost"
          value={moneyShort(avgMonthly)}
          sub={earliest ? `since ${fmtDate(earliest)}` : "—"}
        />
        <StatTile
          label={`Cost ${u.perDistWord}`}
          value={u.perDist(costPerKm)}
          sub={km ? `${u.dist(km)} recorded` : "need 2+ odometer readings"}
        />
        <StatTile
          label="Total + vehicle"
          value={moneyShort(ownership + purchase)}
          sub={
            purchase
              ? `incl. ${moneyShort(purchase)} purchase`
              : "add purchase price"
          }
        />
      </div>

      <div className="two-col" style={{ marginTop: 20 }}>
        <div>
          <h3 className="section-title">Spending breakdown</h3>
          <div className="card">
            <CategoryBars totals={totals} units={user.units} />
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
          {usesCharging(pt) && (
            <>
              <h3 className="section-title">Quick charge</h3>
              <QuickCharge vehicleId={vid} homeKwhPrice={user.homeKwhPrice} />
            </>
          )}
          {usesFuel(pt) && (
            <>
              <h3 className="section-title">Quick fill-up</h3>
              <QuickFuel
                vehicleId={vid}
                lastStation={b.fuel.find((f) => f.station)?.station ?? null}
              />
            </>
          )}

          <h3 className="section-title">Reminders</h3>
          <div className="card">
            {reminders.length === 0 ? (
              <p className="muted">
                No reminders set.{" "}
                <Link href={`/app/v/${vid}/reminders`}>Add one</Link>.
              </p>
            ) : (
              <div className="list">
                {reminders.map((r) => (
                  <div className="list-item" key={r.id}>
                    <div className="l-main">
                      <div className="l-title">{r.title}</div>
                      <div className="l-sub">
                        {r.dueDate
                          ? fmtDate(r.dueDate)
                          : r.dueOdometer != null
                            ? u.dist(r.dueOdometer)
                            : "—"}
                      </div>
                    </div>
                    <StatusChip status={r.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {ev && (
            <>
              <h3 className="section-title">Charging</h3>
              <div className="card">
                {ev.sessions === 0 ? (
                  <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                    Log charging sessions to see your real cost per kWh,
                    efficiency and how much you’re saving compared with gas.
                  </p>
                ) : (
                  <div className="list">
                    <div className="list-item">
                      <div className="l-main">
                        <div className="l-title">Efficiency</div>
                        <div className="l-sub">
                          at the plug, incl. charging losses
                        </div>
                      </div>
                      <div className="l-val tabular">
                        {ev.kwhPer100 != null
                          ? `${u.evEffValue(ev.kwhPer100)} ${u.evEffUnit}`
                          : "—"}
                      </div>
                    </div>
                    <div className="list-item">
                      <div className="l-main">
                        <div className="l-title">Average price</div>
                        <div className="l-sub">
                          {numFmt(Math.round(ev.totalKwh))} kWh over{" "}
                          {ev.sessions} sessions
                        </div>
                      </div>
                      <div className="l-val tabular">
                        {ev.avgPricePerKwh != null
                          ? `${u.price(ev.avgPricePerKwh)}/kWh`
                          : "—"}
                      </div>
                    </div>
                    <div className="list-item">
                      <div className="l-main">
                        <div className="l-title">Saved vs gas</div>
                        <div className="l-sub">
                          {ev.distanceKm
                            ? `over ${u.dist(ev.distanceKm)}`
                            : "add odometer to 2+ charges"}
                        </div>
                      </div>
                      <div className="l-val tabular">
                        {ev.savingsCents != null
                          ? moneyShort(ev.savingsCents)
                          : "—"}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {usesFuel(pt) && (
            <>
              <h3 className="section-title">Fuel economy</h3>
              <div className="card">
                {lastEco ? (
                  <>
                    <div
                      style={{ fontSize: 26, fontWeight: 700 }}
                      className="tabular"
                    >
                      {u.econ(lastEco.l100)}
                    </div>
                    <p
                      className="muted"
                      style={{ fontSize: 12.5, margin: "6px 0 0" }}
                    >
                      Last full-to-full fill ({u.dist(lastEco.dist)},{" "}
                      {fmtDate(lastEco.date)})
                    </p>
                  </>
                ) : (
                  <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                    Log two full-tank fill-ups with odometer and litres to see
                    your real-world fuel economy.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
