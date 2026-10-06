import { VehicleDangerZone } from "@/components/vehicle-danger-zone";
import { VehicleForm } from "@/components/vehicle-form";
import { odometerAnomalies } from "@/lib/calc";
import { fmtDate, numFmt, vehicleName } from "@/lib/format";
import { getVehicleBundle } from "@/server/data";
import { requireUser } from "@/server/session";

export const metadata = { title: "Vehicle" };

export default async function VehiclePage({ params }: PageProps<"/app/v/[vid]/vehicle">) {
  const user = await requireUser();
  const { vid } = await params;
  const b = await getVehicleBundle(user.id, vid);
  const anomalies = odometerAnomalies([
    ...b.fuel.map((r) => ({ ...r, src: "Fuel" })),
    ...b.maintenance.map((r) => ({ ...r, src: "Maintenance" })),
  ]);
  return (
    <div style={{ maxWidth: 760 }}>
      <VehicleForm vehicle={b.vehicle} />
      <h3 className="section-title">Data check</h3>
      <div className="card">
        <div className="muted" style={{ fontSize: 13 }}>
          {b.fuel.length} fuel · {b.maintenance.length} maintenance · {b.costs.length} recurring/other · {b.reminders.length} reminders
        </div>
        {anomalies.length === 0 ? (
          <p className="muted" style={{ marginBottom: 0 }}>
            No odometer inconsistencies detected.
          </p>
        ) : (
          anomalies.map((a, i) => (
            <div className="note" key={i} style={{ marginTop: 8, marginBottom: 0 }}>
              {a.src} entry on {fmtDate(a.date)} shows {numFmt(a.odo)} km, lower than {numFmt(a.prevOdo)} km recorded on {fmtDate(a.prevDate)}.
            </div>
          ))
        )}
      </div>
      <VehicleDangerZone id={vid} name={vehicleName(b.vehicle)} archived={!!b.vehicle.archivedAt} />
    </div>
  );
}
