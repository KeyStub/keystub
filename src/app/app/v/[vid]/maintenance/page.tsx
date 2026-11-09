import Link from "next/link";
import { MaintenanceLog } from "@/components/logs";
import { getVehicleBundle } from "@/server/data";
import { requireUser } from "@/server/session";

export const metadata = { title: "Maintenance" };

export default async function MaintenancePage({ params }: PageProps<"/app/v/[vid]/maintenance">) {
  const user = await requireUser();
  const { vid } = await params;
  const b = await getVehicleBundle(user.id, vid);
  return (
    <>
      <div className="card history-cta no-print">
        <div>
          <b>Maintenance history report</b>
          <div className="muted" style={{ fontSize: 13 }}>
            Print, save as PDF or send your full service record: for a buyer, or a new shop.{user.effectivePlan !== "pro" ? " (Pro)" : ""}
          </div>
        </div>
        <Link href={`/app/v/${vid}/history`} className="btn">
          Open report
        </Link>
      </div>
      <MaintenanceLog vehicleId={vid} rows={b.maintenance} />
    </>
  );
}
