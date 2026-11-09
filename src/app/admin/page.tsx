import { and, count, eq, inArray, isNotNull, sql } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { feedback, user } from "@/db/schema";
import { adminPath, OPEN_STATUSES } from "@/lib/admin";
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
      <p className="muted" style={{ fontSize: 13, marginTop: 16 }}>
        Revenue, sign-up charts and failed emails will appear here once billing and analytics are switched on.
      </p>
    </>
  );
}
