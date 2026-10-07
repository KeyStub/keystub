import { homeVehicle } from "@/server/home";
import { requireUser } from "@/server/session";
import { MobileNav } from "./mobile-nav";

/** The same bottom tab bar as inside a vehicle, pointed at the Home vehicle. Nothing if there are no vehicles yet. */
export async function HomeNav() {
  const user = await requireUser();
  const v = await homeVehicle(user.id);
  return v ? <MobileNav vid={v.id} powertrain={v.powertrain} /> : null;
}
