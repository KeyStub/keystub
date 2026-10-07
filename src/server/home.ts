import "server-only";
import { cookies } from "next/headers";
import { listVehicles } from "./data";

export const LAST_VEHICLE_COOKIE = "ks_vid";

/** The vehicle "Home" opens: the one last viewed (if still yours and active), else the first one. */
export async function homeVehicle(userId: string) {
  const vs = await listVehicles(userId);
  if (!vs.length) return null;
  const last = (await cookies()).get(LAST_VEHICLE_COOKIE)?.value;
  const v = vs.find((x) => x.id === last) ?? vs[0];
  return { id: v.id, powertrain: v.powertrain };
}
