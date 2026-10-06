import { BatteryLog } from "@/components/ev";
import { StatTile } from "@/components/ui";
import { fmtDate, numFmt } from "@/lib/format";
import { getVehicleBundle } from "@/server/data";
import { requireUser } from "@/server/session";

export const metadata = { title: "Battery" };

export default async function BatteryPage({ params }: PageProps<"/app/v/[vid]/battery">) {
  const user = await requireUser();
  const { vid } = await params;
  const b = await getVehicleBundle(user.id, vid);
  const v = b.vehicle;
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
          value={latestRange ? `${numFmt(latestRange.rangeAtFullKm!)} km` : "—"}
          sub={latestRange && v.ratedRangeKm ? `${Math.round((latestRange.rangeAtFullKm! / v.ratedRangeKm) * 100)}% of ${numFmt(v.ratedRangeKm)} km rated` : v.ratedRangeKm ? `rated ${numFmt(v.ratedRangeKm)} km when new` : "add rated range in Vehicle"}
        />
        <StatTile
          label="Range change"
          value={rangeChange != null ? `${rangeChange > 0 ? "+" : ""}${numFmt(rangeChange)} km` : "—"}
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
