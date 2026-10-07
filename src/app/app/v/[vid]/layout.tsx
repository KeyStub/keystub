import { AppTopBar } from "@/components/app-top-bar";
import { MobileNav } from "@/components/mobile-nav";
import { RememberVehicle } from "@/components/remember-vehicle";
import { VehicleTabs } from "@/components/vehicle-tabs";
import { fmtDate, numFmt, vehicleName } from "@/lib/format";
import { makeFmt } from "@/lib/units";
import { getVehicleBundle } from "@/server/data";
import { requireUser } from "@/server/session";

export default async function VehicleLayout({ children, params }: LayoutProps<"/app/v/[vid]">) {
  const user = await requireUser();
  const { vid } = await params;
  const { vehicle: v, fuel, maintenance, charges, battery } = await getVehicleBundle(user.id, vid);
  const u = makeFmt(user.units);
  const full = [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ");
  // Show the highest reading we know of, even if the profile's odometer was never filled in.
  const odo = Math.max(v.currentOdometer ?? -1, ...fuel.map((r) => r.odometer ?? -1), ...maintenance.map((r) => r.odometer ?? -1), ...charges.map((r) => r.odometer ?? -1), ...battery.map((r) => r.odometer ?? -1));
  const purchased = [
    v.purchaseDate ? `Purchased ${fmtDate(v.purchaseDate)}` : v.purchasePriceCents != null ? "Purchased" : null,
    v.purchasePriceCents != null ? `for ${u.money(v.purchasePriceCents)}` : null,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="shell has-mnav">
      <header className="top">
        <AppTopBar />
        <div className="header-row" style={{ marginTop: 10 }}>
          <div>
            <div className="veh-name">{vehicleName(v)}</div>
            <div className="veh-sub">
              {v.nickname && full ? full + " · " : ""}
              {purchased || "Fill in the Vehicle tab to get started"}
            </div>
          </div>
          <div className="odo-pill">
            <span>Odometer</span> <b className="tabular">{odo >= 0 ? numFmt(u.distToUser(odo)!) : "—"}</b> <span>{u.distUnit}</span>
          </div>
        </div>
        <VehicleTabs vid={vid} powertrain={v.powertrain} />
      </header>
      <main className="page">{children}</main>
      <MobileNav vid={vid} powertrain={v.powertrain} />
      <RememberVehicle vid={vid} />
    </div>
  );
}
