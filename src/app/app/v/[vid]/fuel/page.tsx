import { FuelLog } from "@/components/logs";
import { fuelEconomySeries } from "@/lib/calc";
import { fmtDate } from "@/lib/format";
import { makeFmt } from "@/lib/units";
import { getVehicleBundle } from "@/server/data";
import { requireUser } from "@/server/session";

export const metadata = { title: "Fuel" };

export default async function FuelPage({ params }: PageProps<"/app/v/[vid]/fuel">) {
  const user = await requireUser();
  const { vid } = await params;
  const b = await getVehicleBundle(user.id, vid);
  const u = makeFmt(user.units);
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
                  <div className="l-sub">{u.dist(e.dist)} on this fill-to-fill</div>
                </div>
                <div className="l-val tabular">{u.econ(e.l100)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
