import { desc, eq } from "drizzle-orm";
import { AccountForms } from "@/components/account-forms";
import { AppTopBar } from "@/components/app-top-bar";
import { HomeNav } from "@/components/home-nav";
import { AppearanceSettings, EnergySettings, ReminderSettings, UnitSettings } from "@/components/settings-forms";
import { ImportPanel } from "@/components/import-panel";
import { db } from "@/db";
import { importLog } from "@/db/schema";
import { fmtDate, vehicleName } from "@/lib/format";
import { PLANS } from "@/lib/plans";
import { billingEnabled } from "@/server/billing";
import { listVehicles } from "@/server/data";
import { requireUser } from "@/server/session";

export const metadata = { title: "Account" };

export default async function AccountPage({ searchParams }: PageProps<"/app/account">) {
  const user = await requireUser();
  const sp = await searchParams;
  const vs = await listVehicles(user.id, { includeArchived: true });
  const imports = await db.select().from(importLog).where(eq(importLog.userId, user.id)).orderBy(desc(importLog.createdAt)).limit(5);
  const plan = PLANS[user.effectivePlan];

  return (
    <div className="shell has-mnav">
      <AppTopBar />
      <HomeNav />
      <main className="page" style={{ maxWidth: 760 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>Account</h1>

        <h3 className="section-title" id="plan">
          Plan
        </h3>
        <div className="card">
          {sp.upgraded && <div className="note info">Thanks for upgrading! Pro is active.</div>}
          {sp.billing === "off" && <div className="note">Paid plans aren&apos;t switched on yet — billing hasn&apos;t been configured for this site.</div>}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{plan.name}{user.trialDaysLeft > 0 ? " (free trial)" : ""}</div>
              {user.trialDaysLeft > 0 && (
                <div style={{ marginBottom: 4 }}>
                  <span className="chip warning">Pro trial: {user.trialDaysLeft} day{user.trialDaysLeft === 1 ? "" : "s"} left</span>
                </div>
              )}
              <div className="muted" style={{ fontSize: 13 }}>
                {plan.features.filter((f) => !f.soon).slice(0, 3).map((f) => f.text).join(" · ")}
              </div>
            </div>
            {user.effectivePlan === "pro" && user.trialDaysLeft === 0 ? (
              billingEnabled() && user.plan === "pro" ? (
                <form action="/api/billing/portal" method="post">
                  <button className="btn">Manage billing</button>
                </form>
              ) : (
                <span className="chip good">Founder access</span>
              )
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <form action="/api/billing/checkout" method="post">
                  <input type="hidden" name="interval" value="month" />
                  <button className="btn">Pro {PLANS.pro.priceMonthly}/mo</button>
                </form>
                <form action="/api/billing/checkout" method="post">
                  <input type="hidden" name="interval" value="year" />
                  <button className="btn primary">Pro {PLANS.pro.priceYearly}/yr</button>
                </form>
              </div>
            )}
          </div>
        </div>

        <h3 className="section-title" id="appearance">
          Appearance
        </h3>
        <AppearanceSettings />

        <h3 className="section-title" id="units">
          Units &amp; currency
        </h3>
        <UnitSettings prefs={user.units} />

        <h3 className="section-title" id="reminders">
          Reminders
        </h3>
        <ReminderSettings leadDays={user.reminderLeadDays} leadKm={user.reminderLeadKm} />

        <h3 className="section-title" id="energy">
          Energy (EVs &amp; plug-in hybrids)
        </h3>
        <EnergySettings homeKwhPrice={user.homeKwhPrice} compareL100={user.compareL100} compareFuelPrice={user.compareFuelPrice} />

        <AccountForms name={user.name} email={user.email} />

        <h3 className="section-title" id="data">
          Your data
        </h3>
        <div className="card">
          <p style={{ marginTop: 0, fontSize: 14 }}>
            Your data is yours. Download a complete copy any time — no lock-in.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a className="btn primary" href="/api/export?format=json">
              Download full backup (JSON)
            </a>
            <a className="btn" href="/api/export?format=csv">
              Download spreadsheet (CSV)
            </a>
          </div>
        </div>

        <h3 className="section-title" id="import">
          Import from the original tracker
        </h3>
        <ImportPanel vehicles={vs.map((v) => ({ id: v.id, name: vehicleName(v) }))} />
        {imports.length > 0 && (
          <div className="card" style={{ marginTop: 12 }}>
            <h3>Import history</h3>
            <div className="list">
              {imports.map((i) => {
                const s = JSON.parse(i.summary);
                return (
                  <div className="list-item" key={i.id}>
                    <div className="l-main">
                      <div className="l-title">{i.source}</div>
                      <div className="l-sub">
                        {fmtDate(i.createdAt.toISOString())} · {s.inserted} added, {s.updated} updated
                      </div>
                    </div>
                    <span className="chip good">totals matched</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
