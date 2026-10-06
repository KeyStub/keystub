import { CostLog } from "@/components/logs";
import { getVehicleBundle } from "@/server/data";
import { requireUser } from "@/server/session";

export const metadata = { title: "Recurring & other costs" };

export default async function CostsPage({ params }: PageProps<"/app/v/[vid]/costs">) {
  const user = await requireUser();
  const { vid } = await params;
  const b = await getVehicleBundle(user.id, vid);
  return <CostLog vehicleId={vid} rows={b.costs} />;
}
