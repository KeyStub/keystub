import { desc, sql } from "drizzle-orm";
import Link from "next/link";
import { Suspense } from "react";
import { AppTopBar } from "@/components/app-top-bar";
import { FeedbackForm } from "@/components/feedback";
import { HomeNav } from "@/components/home-nav";
import { db } from "@/db";
import { feedback, ticketMessages } from "@/db/schema";
import { TICKET_KIND_LABEL, ticketCode } from "@/lib/admin";
import { fmtDate } from "@/lib/format";
import { requireUser } from "@/server/session";
import { isPastReopenWindow } from "@/server/tickets";

export const metadata = { title: "Support & feedback" };

const STATUS: Record<string, [string, string]> = {
  new: ["neutral", "Waiting for KeyStub"],
  in_progress: ["warning", "In progress"],
  planned: ["warning", "Planned"],
  done: ["good", "Resolved"],
  closed: ["neutral", "Closed"],
};

export default async function FeedbackPage() {
  const user = await requireUser();
  const mine = await db
    .select({
      id: feedback.id,
      number: feedback.number,
      kind: feedback.kind,
      message: feedback.message,
      status: feedback.status,
      createdAt: feedback.createdAt,
      updatedAt: feedback.updatedAt,
      // a staff reply the customer hasn't opened yet
      unread: sql<boolean>`exists (select 1 from ${ticketMessages} m where m.ticket_id = "feedback"."id" and m.kind = 'reply' and m.created_at > coalesce("feedback"."customer_seen_at", 'epoch'::timestamptz))`,
    })
    .from(feedback)
    .where(sql`(${feedback.userId} = ${user.id} or lower(${feedback.email}) = ${user.email.toLowerCase()})`)
    .orderBy(desc(feedback.updatedAt))
    .limit(50);
  return (
    <div className="shell has-mnav">
      <AppTopBar />
      <HomeNav />
      <main className="page" style={{ maxWidth: 760 }}>
        <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>Support &amp; feedback</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Found a bug, have an idea, or stuck on something? Tell us. KeyStub is built around what drivers ask for.
        </p>
        {mine.length > 0 && (
          <>
            <h3 className="section-title" style={{ marginTop: 0 }}>
              Your tickets
            </h3>
            <div className="card adm-list" style={{ marginBottom: 20 }}>
              {mine.map((f) => {
                const closed = isPastReopenWindow(f);
                const [chip, label] = closed ? ["neutral", "Closed"] : (STATUS[f.status] ?? ["neutral", f.status]);
                return (
                  <Link key={f.id} href={`/app/feedback/${f.number}`} className={`my-ticket${f.unread ? " unread" : ""}`}>
                    <span className="my-ticket-main">
                      <b>{f.message.split("\n")[0].slice(0, 100)}</b>
                      <span className="muted">
                        {ticketCode(f.number)} · {TICKET_KIND_LABEL[f.kind] ?? f.kind} · {fmtDate(f.createdAt.toISOString().slice(0, 10))}
                      </span>
                    </span>
                    {f.unread ? (
                      <span className="chip critical">
                        <span className="dot" />
                        New reply
                      </span>
                    ) : (
                      <span className={`chip ${chip}`}>
                        <span className="dot" />
                        {label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </>
        )}
        <h3 className="section-title" style={mine.length ? undefined : { marginTop: 0 }}>
          Send something new
        </h3>
        <Suspense>
          <FeedbackForm />
        </Suspense>
        <p className="muted" style={{ fontSize: 13, marginTop: 16 }}>
          Need help with your account or billing? Email <a href="mailto:support@keystub.com">support@keystub.com</a>.
        </p>
      </main>
    </div>
  );
}
