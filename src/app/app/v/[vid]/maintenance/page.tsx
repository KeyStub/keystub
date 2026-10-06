import { MaintenanceLog } from "@/components/logs";
import { getVehicleBundle } from "@/server/data";
import { requireUser } from "@/server/session";

export const metadata = { title: "Maintenance" };

export default async function MaintenancePage({ params }: PageProps<"/app/v/[vid]/maintenance">) {
  const user = await requireUser();
  const { vid } = await params;
  const b = await getVehicleBundle(user.id, vid);
  return <MaintenanceLog vehicleId={vid} rows={b.maintenance} />;
}
