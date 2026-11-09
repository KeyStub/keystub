import { and, count, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { feedback } from "@/db/schema";
import { adminPath, FEEDBACK_STATUSES, OPEN_STATUSES, parseTicketCode, TICKET_KIND_LABEL, ticketCode } from "@/lib/admin";
import { requireStaff } from "@/server/staff";

export const metadata = { title: "Support tickets" };

const CHIP: Record<string, string> = { new: "critical", in_progress: "warning", planned: "warning", done: "good", closed: "neutral" };

export default async function Tickets({ searchParams }: PageProps<"/admin/tickets">) {
  await requireStaff("tickets");
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "all";
  const kind = typeof sp.kind === "string" ? sp.kind : "all";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const where: SQL[] = [];
  if (status === "open") where.push(inArray(feedback.status, OPEN_STATUSES));
  else if (status !== "all") where.push(eq(feedback.status, status));
  if (kind !== "all") where.push(eq(feedback.kind, kind));
  if (q) {
    const n = parseTicketCode(q);
    where.push(n ? eq(feedback.number, n) : or(ilike(feedback.email, `%${q}%`), ilike(feedback.name, `%${q}%`), ilike(feedback.message, `%${q}%`))!);
  }
  const [items, counts] = await Promise.all([
    db
      .select({ id: feedback.id, number: feedback.number, kind: feedback.kind, name: feedback.name, email: feedback.email, message: feedback.message, status: feedback.status, createdAt: feedback.createdAt, updatedAt: feedback.updatedAt })
      .from(feedback)
      .where(where.length ? and(...where) : undefined)
      .orderBy(desc(feedback.updatedAt))
      .limit(300),
    db.select({ status: feedback.status, n: count() }).from(feedback).groupBy(feedback.status),
  ]);
  const n = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;
  const link = (patch: Record<string, string>) => `${adminPath("/admin/tickets")}?${new URLSearchParams({ status, kind, ...(q ? { q } : {}), ...patch })}`;
  return (
    <>
      <h1 className="adm-h1">Support tickets</h1>
      <form className="adm-search" action={adminPath("/admin/tickets")}>
        <input type="hidden" name="status" value="all" />
        <input className="input" name="q" defaultValue={q} placeholder="Search by #KS number, email, name or words…" />
        <button className="btn">Search</button>
      </form>
      <div className="fb-filters">
        {[["all", `All (${counts.reduce((t, c) => t + c.n, 0)})`], ["open", `Open (${OPEN_STATUSES.reduce((t, s) => t + n(s), 0)})`], ...FEEDBACK_STATUSES.map((s) => [s.id, `${s.label} (${n(s.id)})`])].map(([id, label]) => (
          <Link key={id} href={link({ status: id })} className={`btn sm ${status === id ? "primary" : "ghost"}`}>
            {label}
          </Link>
        ))}
      </div>
      <div className="fb-filters">
        {[["all", "All types"], ...Object.entries(TICKET_KIND_LABEL)].map(([id, label]) => (
          <Link key={id} href={link({ kind: id })} className={`btn sm ${kind === id ? "primary" : "ghost"}`}>
            {label}
          </Link>
        ))}
      </div>
      {items.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 32 }}>
          <p className="muted" style={{ margin: 0 }}>{q ? "No tickets match that search." : "Nothing here. 🎉"}</p>
        </div>
      ) : (
        <div className="card adm-list">
          {items.map((t) => (
            <Link key={t.id} href={adminPath(`/admin/tickets/${t.number}`)} className={`adm-row${t.status === "new" ? " unread" : ""}`}>
              <span className="adm-code tabular">{ticketCode(t.number)}</span>
              <span className="adm-kind">{TICKET_KIND_LABEL[t.kind] ?? t.kind}</span>
              <span className="adm-subj">
                <b>{t.name || t.email}</b>
                <span className="muted"> · {t.message.replace(/\s+/g, " ").slice(0, 110)}</span>
              </span>
              <span className={`chip ${CHIP[t.status] ?? "neutral"}`}>
                <span className="dot" />
                {FEEDBACK_STATUSES.find((s) => s.id === t.status)?.label ?? t.status}
              </span>
              <span className="adm-date muted">{t.updatedAt.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
