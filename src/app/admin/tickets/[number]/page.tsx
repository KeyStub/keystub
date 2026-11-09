import { and, asc, count, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TicketComposer, TicketStatusSelect } from "@/components/admin";
import { db } from "@/db";
import { feedback, ticketMessages, user, vehicles } from "@/db/schema";
import { CONTACT_TOPICS, TICKET_KIND_LABEL, ticketCode } from "@/lib/admin";
import { effectivePlan, PLANS } from "@/lib/plans";
import { requireStaff } from "@/server/staff";

export async function generateMetadata({ params }: PageProps<"/admin/tickets/[number]">) {
  return { title: `Ticket #KS${(await params).number}` };
}

const when = (d: Date) => d.toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });

export default async function TicketPage({ params }: PageProps<"/admin/tickets/[number]">) {
  await requireStaff("tickets");
  const num = Number((await params).number);
  if (!Number.isInteger(num)) notFound();
  const [t] = await db.select().from(feedback).where(eq(feedback.number, num));
  if (!t) notFound();
  const [msgs, customer] = await Promise.all([
    db.select().from(ticketMessages).where(eq(ticketMessages.ticketId, t.id)).orderBy(asc(ticketMessages.createdAt)),
    t.userId
      ? db
          .select({ id: user.id, name: user.name, email: user.email, createdAt: user.createdAt, plan: user.plan, trialEndsAt: user.trialEndsAt })
          .from(user)
          .where(eq(user.id, t.userId))
          .then((r) => r[0])
      : Promise.resolve(undefined),
  ]);
  const vehicleCount = customer ? (await db.select({ n: count() }).from(vehicles).where(and(eq(vehicles.userId, customer.id))))[0].n : 0;
  const code = ticketCode(t.number);

  return (
    <>
      <Link href="/admin/tickets" className="adm-back">
        ← All tickets
      </Link>
      <div className="adm-ticket-head">
        <div>
          <div className="muted" style={{ fontSize: 13 }}>
            {TICKET_KIND_LABEL[t.kind] ?? t.kind}
            {t.topic ? ` · ${CONTACT_TOPICS.find((x) => x.id === t.topic)?.label ?? t.topic}` : ""}
          </div>
          <h1 className="adm-h1" style={{ margin: "2px 0 0" }}>
            {code}
          </h1>
        </div>
        <TicketStatusSelect id={t.id} status={t.status} />
      </div>

      <div className="adm-ticket">
        <div className="adm-thread">
          <article className="adm-msg customer">
            <div className="adm-msg-head">
              <b>{t.name || t.email}</b>
              <span className="muted">{when(t.createdAt)}</span>
            </div>
            <p>{t.message}</p>
          </article>
          {msgs.map((m) => (
            <article key={m.id} className={`adm-msg ${m.kind}`}>
              <div className="adm-msg-head">
                <b>{m.kind === "note" ? `📝 Note · ${m.authorName ?? "Staff"}` : m.kind === "auto_reply" ? "🤖 Auto-reply sent" : `↩ Reply · ${m.authorName ?? "Staff"}`}</b>
                <span className="muted">
                  {when(m.createdAt)}
                  {m.emailStatus === "failed" ? " · ⚠ email failed" : m.emailStatus === "sent" ? " · emailed" : ""}
                </span>
              </div>
              <p>{m.body}</p>
            </article>
          ))}
          <TicketComposer ticketId={t.id} customer={t.name || t.email} />
        </div>

        <aside className="adm-aside">
          <div className="card">
            <div className="adm-aside-label">Customer</div>
            <div style={{ fontWeight: 700 }}>{t.name || "—"}</div>
            <a href={`mailto:${t.email}`} style={{ fontSize: 13.5, wordBreak: "break-all" }}>
              {t.email}
            </a>
            {customer ? (
              <div className="muted" style={{ fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
                Account since {customer.createdAt.toLocaleDateString("en-CA", { dateStyle: "medium" })}
                <br />
                {PLANS[effectivePlan({ plan: customer.plan, email: customer.email, trialEndsAt: customer.trialEndsAt })].name} plan · {vehicleCount} vehicle
                {vehicleCount === 1 ? "" : "s"}
              </div>
            ) : (
              <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>
                No KeyStub account with this email.
              </div>
            )}
          </div>
          <div className="card">
            <div className="adm-aside-label">Details</div>
            <div className="muted" style={{ fontSize: 13, lineHeight: 1.7 }}>
              Received {when(t.createdAt)}
              {t.page && (
                <>
                  <br />
                  Page: {t.page}
                </>
              )}
              {t.userAgent && (
                <>
                  <br />
                  <span title={t.userAgent}>Device: {/iPhone|iPad/.test(t.userAgent) ? "iPhone/iPad" : /Android/.test(t.userAgent) ? "Android" : /Mac/.test(t.userAgent) ? "Mac" : /Windows/.test(t.userAgent) ? "Windows" : "Other"}</span>
                </>
              )}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
