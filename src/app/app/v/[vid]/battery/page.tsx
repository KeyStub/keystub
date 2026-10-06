import { BatteryLog } from "@/components/ev";
import { StatTile } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import { makeFmt } from "@/lib/units";
import { getVehicleBundle } from "@/server/data";
import { requireUser } from "@/server/session";

export const metadata = { title: "Battery" };

export default async function BatteryPage({ params }: PageProps<"/app/v/[vid]/battery">) {
  const user = await requireUser();
  const { vid } = await params;
  const b = await getVehicleBundle(user.id, vid);
  const v = b.vehicle;
  const u = makeFmt(user.units);
  const latestHealth = b.battery.find((r) => r.healthPct != null);
  const latestRange = b.battery.find((r) => r.rangeAtFullKm != null);
  const firstRange = b.battery.findLast((r) => r.rangeAtFullKm != null);
  const rangeChange = latestRange && firstRange && latestRange !== firstRange ? latestRange.rangeAtFullKm! - firstRange.rangeAtFullKm! : null;

  return (
    <>
      <div className="grid stat-row" style={{ marginBottom: 20 }}>
        <StatTile label="Battery health" value={latestHealth ? `${latestHealth.healthPct!.toFixed(1)}%` : "—"} sub={latestHealth ? `as of ${fmtDate(latestHealth.date)}` : "add a check"} />
        <StatTile
          label="Range at 100%"
          value={latestRange ? u.dist(latestRange.rangeAtFullKm) : "—"}
          sub={latestRange && v.ratedRangeKm ? `${Math.round((latestRange.rangeAtFullKm! / v.ratedRangeKm) * 100)}% of ${u.dist(v.ratedRangeKm)} rated` : v.ratedRangeKm ? `rated ${u.dist(v.ratedRangeKm)} when new` : "add rated range in Vehicle"}
        />
        <StatTile
          label="Range change"
          value={rangeChange != null ? `${rangeChange > 0 ? "+" : rangeChange < 0 ? "−" : ""}${u.dist(Math.abs(rangeChange))}` : "—"}
          sub={rangeChange != null ? "first check to latest" : "needs 2+ checks"}
        />
        <StatTile label="Battery size" value={v.batteryKwh ? `${v.batteryKwh} kWh` : "—"} sub={v.batteryKwh ? "usable capacity" : "add it in Vehicle"} />
      </div>
      <BatteryLog vehicleId={vid} rows={b.battery} ratedRangeKm={v.ratedRangeKm} />
      <p className="muted" style={{ fontSize: 12.5, marginTop: 12 }}>
        Range estimates swing with temperature and driving style, so compare checks from similar seasons. Battery health % from the car or a dealer report is the
        most reliable number.
      </p>
    </>
  );
}
