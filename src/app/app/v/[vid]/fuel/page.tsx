import { FuelLog } from "@/components/logs";
import { fuelEconomySeries } from "@/lib/calc";
import { fmtDate, numFmt } from "@/lib/format";
import { getVehicleBundle } from "@/server/data";
import { requireUser } from "@/server/session";

export const metadata = { title: "Fuel" };

export default async function FuelPage({ params }: PageProps<"/app/v/[vid]/fuel">) {
  const user = await requireUser();
  const { vid } = await params;
  const b = await getVehicleBundle(user.id, vid);
  const eco = fuelEconomySeries(b.fuel).slice(-6).reverse();
  return (
    <>
      <FuelLog vehicleId={vid} rows={b.fuel} />
      {eco.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Fuel economy (full tank to full tank)</h3>
          <div className="list" style={{ marginTop: 8 }}>
            {eco.map((e) => (
              <div className="list-item" key={e.date + e.dist}>
                <div className="l-main">
                  <div className="l-title">{fmtDate(e.date)}</div>
                  <div className="l-sub">{numFmt(e.dist)} km on this fill-to-fill</div>
                </div>
                <div className="l-val tabular">{e.l100.toFixed(1)} L/100km</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
