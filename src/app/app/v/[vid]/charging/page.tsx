import Link from "next/link";
import { ChargeLog } from "@/components/logs";
import { StatTile } from "@/components/ui";
import { CHARGE_LOCATIONS, chargingStats } from "@/lib/calc";
import { money, moneyShort, numFmt } from "@/lib/format";
import { getVehicleBundle } from "@/server/data";
import { requireUser } from "@/server/session";

export const metadata = { title: "Charging" };

export default async function ChargingPage({ params }: PageProps<"/app/v/[vid]/charging">) {
  const user = await requireUser();
  const { vid } = await params;
  const b = await getVehicleBundle(user.id, vid);
  const st = chargingStats(b.charges, { l100: user.compareL100, fuelPrice: user.compareFuelPrice });
  const locs = Object.entries(st.byLocation).sort((a, c) => c[1].kwh - a[1].kwh);
  const homeShare = st.totalKwh > 0 ? ((st.byLocation.home?.kwh ?? 0) / st.totalKwh) * 100 : null;

  return (
    <>
      {b.charges.length > 0 && (
        <>
          <div className="grid stat-row" style={{ marginBottom: 20 }}>
            <StatTile label="Spent on charging" value={moneyShort(st.totalCents)} sub={`${st.sessions} session${st.sessions === 1 ? "" : "s"}`} />
            <StatTile label="Energy added" value={`${numFmt(Math.round(st.totalKwh))} kWh`} sub={homeShare != null ? `${Math.round(homeShare)}% at home` : undefined} />
            <StatTile label="Average price" value={st.avgPricePerKwh != null ? `$${st.avgPricePerKwh.toFixed(3)}` : "—"} sub="per kWh, all locations" />
            <StatTile
              label="Efficiency"
              value={st.kwhPer100 != null ? `${st.kwhPer100.toFixed(1)}` : "—"}
              sub={st.kwhPer100 != null ? "kWh/100 km, at the plug" : "add odometer to 2+ charges"}
            />
            <StatTile
              label="Energy cost per km"
              value={st.centsPerKm != null ? `$${(st.centsPerKm / 100).toFixed(3)}` : "—"}
              sub={st.distanceKm ? `over ${numFmt(st.distanceKm)} km` : "needs odometer readings"}
            />
            <StatTile
              label="Saved vs gas"
              value={st.savingsCents != null ? moneyShort(st.savingsCents) : "—"}
              sub={st.gasEquivalentCents != null ? `gas would be ~${moneyShort(st.gasEquivalentCents)}` : "needs odometer readings"}
            />
          </div>
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginTop: 0 }}>Where you charge</h3>
            <div className="list">
              {locs.map(([loc, v]) => (
                <div className="list-item" key={loc}>
                  <div className="l-main">
                    <div className="l-title">{CHARGE_LOCATIONS[loc] ?? loc}</div>
                    <div className="l-sub">
                      {v.count} session{v.count === 1 ? "" : "s"} · {numFmt(Math.round(v.kwh))} kWh ·{" "}
                      {v.kwh > 0 ? `$${(v.cents / 100 / v.kwh).toFixed(3)}/kWh` : "—"}
                    </div>
                  </div>
                  <div className="l-val tabular">{money(v.cents)}</div>
                </div>
              ))}
            </div>
            <p className="muted" style={{ fontSize: 12.5, margin: "10px 0 0" }}>
              “Saved vs gas” compares against a {user.compareL100} L/100 km car at ${user.compareFuelPrice.toFixed(2)}/L.{" "}
              <Link href="/app/account#energy">Change these</Link>.
            </p>
          </div>
        </>
      )}
      <ChargeLog vehicleId={vid} rows={b.charges} homeKwhPrice={user.homeKwhPrice} />
    </>
  );
}
