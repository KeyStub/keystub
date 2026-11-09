import Link from "next/link";
import { redirect } from "next/navigation";
import { makeFmt } from "@/lib/units";
import { AppTopBar } from "@/components/app-top-bar";
import { HomeNav } from "@/components/home-nav";
import { fmtDate, vehicleName } from "@/lib/format";
import { RestoreVehicleButton } from "@/components/vehicle-danger-zone";
import { PLANS } from "@/lib/plans";
import { listVehicles } from "@/server/data";
import { requireUser } from "@/server/session";

export const metadata = { title: "Your garage" };

export default async function GaragePage({ searchParams }: PageProps<"/app">) {
  const user = await requireUser();
  if (!user.onboardedAt) redirect("/app/welcome");
  const u = makeFmt(user.units);
  const all = await listVehicles(user.id, { includeArchived: true });
  const vs = all.filter((v) => !v.archivedAt);
  const archived = all.filter((v) => v.archivedAt);
  const sp = await searchParams;
  // One vehicle: go straight to it (the common case), unless the user explicitly opened the garage.
  if (vs.length === 1 && !sp.garage) redirect(`/app/v/${vs[0].id}`);
  const limit = PLANS[user.effectivePlan].maxVehicles;

  return (
    <div className="shell has-mnav">
      <AppTopBar />
      <HomeNav />
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
            <Link href="/app/account/plan" className="btn">
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
              <Link href="/app/account/data#import" className="btn">
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
                  {v.currentOdometer != null ? u.dist(v.currentOdometer) : "Odometer not set"}
                </div>
              </Link>
            ))}
          </div>
        )}
        <p className="muted" style={{ fontSize: 12.5, marginTop: 16 }}>
          {vs.length} of {limit} vehicles on the {PLANS[user.effectivePlan].name} plan{archived.length ? " (archived vehicles don't count)" : ""}.
        </p>
        {archived.length > 0 && (
          <section id="archived" style={{ marginTop: 28 }}>
            <h2 className="section-title" style={{ fontSize: 17 }}>
              Archived vehicles ({archived.length})
            </h2>
            <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
              Hidden from your garage with every record kept. Open one to look back at its history, or restore it to start tracking again.
            </p>
            <div className="card" style={{ padding: 0 }}>
              <div className="list">
                {archived.map((v) => (
                  <div className="list-item" key={v.id} style={{ padding: "12px 16px" }}>
                    <div className="l-main">
                      <div className="l-title">{vehicleName(v)}</div>
                      <div className="l-sub">Archived {fmtDate(v.archivedAt!.toISOString().slice(0, 10))}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Link href={`/app/v/${v.id}`} className="btn sm ghost">
                        Open
                      </Link>
                      <RestoreVehicleButton id={v.id} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
