import { PLANS } from "@/lib/plans";
import { billingEnabled } from "@/server/billing";
import { requireUser } from "@/server/session";

export const metadata = { title: "Plan & billing" };

export default async function PlanPage({ searchParams }: PageProps<"/app/account/plan">) {
  const user = await requireUser();
  const sp = await searchParams;
  const plan = PLANS[user.effectivePlan];
  return (
    <>
      <h2 className="acc-h2">Plan &amp; billing</h2>
      <div className="card">
        {sp.upgraded && <div className="note info">Thanks for upgrading! Pro is active.</div>}
        {sp.billing === "off" && <div className="note">Paid plans aren&apos;t switched on yet. Billing hasn&apos;t been set up for this site.</div>}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {plan.name}
              {user.trialDaysLeft > 0 ? " (free trial)" : ""}
            </div>
            {user.trialDaysLeft > 0 && (
              <div style={{ marginBottom: 4 }}>
                <span className="chip warning">
                  Pro trial: {user.trialDaysLeft} day{user.trialDaysLeft === 1 ? "" : "s"} left
                </span>
              </div>
            )}
            <div className="muted" style={{ fontSize: 13 }}>
              {plan.features
                .filter((f) => !f.soon)
                .slice(0, 3)
                .map((f) => f.text)
                .join(" · ")}
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
      <p className="muted" style={{ fontSize: 13 }}>
        Compare plans on the <a href="/pricing">pricing page</a>.
      </p>
    </>
  );
}
