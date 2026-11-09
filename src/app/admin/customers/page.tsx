import { count, desc, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { user, vehicles } from "@/db/schema";
import { effectivePlan, PLANS } from "@/lib/plans";
import { requireStaff } from "@/server/staff";

export const metadata = { title: "Customers" };

export default async function Customers({ searchParams }: PageProps<"/admin/customers">) {
  await requireStaff("customers");
  const q = typeof (await searchParams).q === "string" ? String((await searchParams).q).trim() : "";
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      verified: user.emailVerified,
      createdAt: user.createdAt,
      plan: user.plan,
      trialEndsAt: user.trialEndsAt,
      currency: user.currency,
      vehicles: sql<number>`(select count(*)::int from ${vehicles} where ${vehicles.userId} = ${user.id})`,
    })
    .from(user)
    .where(q ? or(ilike(user.email, `%${q}%`), ilike(user.name, `%${q}%`)) : undefined)
    .orderBy(desc(user.createdAt))
    .limit(200);
  const [{ n: total }] = await db.select({ n: count() }).from(user);
  return (
    <>
      <h1 className="adm-h1">Customers</h1>
      <form className="adm-search" action="/admin/customers">
        <input className="input" name="q" defaultValue={q} placeholder="Search by name or email…" />
        <button className="btn">Search</button>
      </form>
      <p className="muted" style={{ fontSize: 13 }}>
        {q ? `${rows.length} match${rows.length === 1 ? "" : "es"}` : `${total} customer${total === 1 ? "" : "s"}, newest first`}. Account details only; customers&apos; records stay
        private.
      </p>
      <div className="card table-wrap" style={{ padding: 0 }}>
        <table className="data">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Plan</th>
              <th className="num">Vehicles</th>
              <th className="hide-sm">Joined</th>
              <th className="hide-sm">Email</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const p = effectivePlan({ plan: r.plan, email: r.email, trialEndsAt: r.trialEndsAt });
              const trial = r.plan !== "pro" && p === "pro";
              return (
                <tr key={r.id}>
                  <td>
                    <b>{r.name || "—"}</b>
                    <div style={{ fontSize: 12.5, wordBreak: "break-all" }}>{r.email}</div>
                  </td>
                  <td>
                    {PLANS[p].name}
                    {trial ? " (trial)" : ""}
                    <div className="muted" style={{ fontSize: 12 }}>{r.currency}</div>
                  </td>
                  <td className="num tabular">{r.vehicles}</td>
                  <td className="hide-sm">{r.createdAt.toLocaleDateString("en-CA", { dateStyle: "medium" })}</td>
                  <td className="hide-sm">{r.verified ? "✓ Confirmed" : "Not confirmed"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
