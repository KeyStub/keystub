import Link from "next/link";
import { redirect } from "next/navigation";
import { AppTopBar } from "@/components/app-top-bar";
import { vehicleName } from "@/lib/format";
import { PLANS } from "@/lib/plans";
import { listVehicles } from "@/server/data";
import { requireUser } from "@/server/session";

export const metadata = { title: "Your garage" };

export default async function GaragePage({ searchParams }: PageProps<"/app">) {
  const user = await requireUser();
  const vs = await listVehicles(user.id);
  const sp = await searchParams;
  // One vehicle: go straight to it (the common case), unless the user explicitly opened the garage.
  if (vs.length === 1 && !sp.garage) redirect(`/app/v/${vs[0].id}`);
  const limit = PLANS[user.effectivePlan].maxVehicles;

  return (
    <div className="shell">
      <AppTopBar />
      <main className="page">
        <div className="toolbar">
          <h1 className="grow" style={{ fontSize: 22, margin: 0 }}>
            Your garage
          </h1>
          {vs.length < limit ? (
            <Link href="/app/vehicles/new" className="btn primary">
              + Add vehicle
            </Link>
          ) : (
            <Link href="/app/account#plan" className="btn">
              Upgrade to add more
            </Link>
          )}
        </div>
        {vs.length === 0 ? (
          <div className="card" style={{ padding: 32, textAlign: "center" }}>
            <h2 style={{ marginTop: 0 }}>Add your first vehicle</h2>
            <p className="muted">Start tracking fuel, maintenance, insurance and everything else it costs you.</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 16 }}>
              <Link href="/app/vehicles/new" className="btn primary">
                Add a vehicle
              </Link>
              <Link href="/app/account#import" className="btn">
                Import a backup file
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
            {vs.map((v) => (
              <Link key={v.id} href={`/app/v/${v.id}`} className="card" style={{ textDecoration: "none", color: "inherit" }}>
                <div className="veh-name">{vehicleName(v)}</div>
                <div className="veh-sub">
                  {v.currentOdometer != null ? `${v.currentOdometer.toLocaleString("en-CA")} km` : "Odometer not set"}
                </div>
              </Link>
            ))}
          </div>
        )}
        <p className="muted" style={{ fontSize: 12.5, marginTop: 16 }}>
          {vs.length} of {limit} vehicles on the {PLANS[user.effectivePlan].name} plan.
        </p>
      </main>
    </div>
  );
}
