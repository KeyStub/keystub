import { redirect } from "next/navigation";
import { homeVehicle } from "@/server/home";
import { requireUser } from "@/server/session";

/** The Home button: straight to your vehicle's dashboard, or the garage if you have none yet. */
export default async function HomePage() {
  const user = await requireUser();
  const v = await homeVehicle(user.id);
  redirect(v ? `/app/v/${v.id}` : "/app?garage=1");
}
