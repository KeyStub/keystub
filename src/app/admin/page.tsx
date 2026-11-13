import { and, count, eq, inArray, isNotNull, sql } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { feedback, user } from "@/db/schema";
import { adminPath, OPEN_STATUSES, TICKET_KIND_LABEL } from "@/lib/admin";
import { requireStaff } from "@/server/staff";

export const metadata = { title: "Overview" };

export default async function AdminOverview() {
  await requireStaff();

  const [[users], [newUsers], [verified], [pro], [trial], [openTickets], [newTickets]] = await Promise.all([
    db.select({ n: count() }).from(user),
    db.select({ n: count() }).from(user).where(sql`${user.createdAt} > now() - interval '7 days'`),
    db.select({ n: count() }).from(user).where(eq(user.emailVerified, true)),
    db.select({ n: count() }).from(user).where(eq(user.plan, "pro")),
    db.select({ n: count() }).from(user).where(and(isNotNull(user.trialEndsAt), sql`${user.trialEndsAt} > now()`)),
    db.select({ n: count() }).from(feedback).where(inArray(feedback.status, OPEN_STATUSES)),
    db.select({ n: count() }).from(feedback).where(eq(feedback.status, "new")),
  ]);
  const tiles = [
    ["Customers", users.n, `${newUsers.n} new this week`, adminPath("/admin/customers")],
    ["Email confirmed", verified.n, "finished signing up", adminPath("/admin/customers")],
    ["On a Pro trial", trial.n, "30-day free trial", adminPath("/admin/customers")],
    ["Paying Pro", pro.n, "billing not live yet", adminPath("/admin/customers")],
    ["Open tickets", openTickets.n, `${newTickets.n} not answered yet`, adminPath("/admin/tickets")],
  ] as const;
  const [byCat, byKind] = await Promise.all([
    db
      .select({ name: feedback.category, n: count() })
      .from(feedback)
      .where(sql`${feedback.createdAt} > now() - interval '30 days'`)
      .groupBy(feedback.category)
      .orderBy(sql`count(*) desc`),
    db
      .select({ name: feedback.kind, n: count() })
      .from(feedback)
      .where(sql`${feedback.createdAt} > now() - interval '30 days'`)
      .groupBy(feedback.kind)
      .orderBy(sql`count(*) desc`),
  ]);
  const total30 = byKind.reduce((t, r) => t + r.n, 0);
  return (
    <>
      <h1 className="adm-h1">Overview</h1>
      <div className="grid stat-row">
        {tiles.map(([label, value, sub, href]) => (
          <Link key={label} href={href} className="card stat" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="label">{label}</div>
            <div className="value tabular">{value}</div>
            <div className="sub">{sub}</div>
          </Link>
        ))}
      </div>
      <div className="adm-patterns">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Tickets by category · last 30 days</h3>
          {total30 === 0 ? (
            <p className="muted" style={{ margin: 0 }}>No tickets yet.</p>
          ) : (
            byCat.map((r) => (
              <div key={r.name ?? "none"} className="adm-bar">
                <span>{r.name ?? <i className="muted">No category yet</i>}</span>
                <span className="adm-bar-track">
                  <span style={{ width: `${Math.round((r.n / total30) * 100)}%` }} />
                </span>
                <b className="tabular">{r.n}</b>
              </div>
            ))
          )}
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>By type · last 30 days</h3>
          {byKind.map((r) => (
            <div key={r.name} className="adm-bar">
              <span>{TICKET_KIND_LABEL[r.name] ?? r.name}</span>
              <span className="adm-bar-track">
                <span style={{ width: `${Math.round((r.n / Math.max(total30, 1)) * 100)}%` }} />
              </span>
              <b className="tabular">{r.n}</b>
            </div>
          ))}
        </div>
      </div>
      <p className="muted" style={{ fontSize: 13, marginTop: 16 }}>
        Revenue, sign-up charts and failed emails will appear here once billing and analytics are switched on.
      </p>
    </>
  );
}
