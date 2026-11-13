import { and, asc, eq, inArray, sql } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppTopBar } from "@/components/app-top-bar";
import { MyTicketActions } from "@/components/feedback";
import { HomeNav } from "@/components/home-nav";
import { db } from "@/db";
import { feedback, ticketMessages } from "@/db/schema";
import { CONTACT_TOPICS, TICKET_KIND_LABEL, ticketCode } from "@/lib/admin";
import { requireUser } from "@/server/session";
import { isPastReopenWindow, REOPEN_DAYS } from "@/server/tickets";

export async function generateMetadata({ params }: PageProps<"/app/feedback/[number]">) {
  return { title: `Ticket #KS${(await params).number}` };
}

const STATUS: Record<string, [string, string]> = {
  new: ["neutral", "Waiting for KeyStub"],
  in_progress: ["warning", "In progress"],
  planned: ["warning", "Planned"],
  done: ["good", "Resolved"],
  closed: ["neutral", "Closed"],
};
const when = (d: Date) => d.toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });

export default async function MyTicketPage({ params }: PageProps<"/app/feedback/[number]">) {
  const user = await requireUser();
  const num = Number((await params).number);
  if (!Number.isInteger(num)) notFound();
  const [t] = await db
    .select()
    .from(feedback)
    .where(and(eq(feedback.number, num), sql`(${feedback.userId} = ${user.id} or lower(${feedback.email}) = ${user.email.toLowerCase()})`));
  if (!t) notFound();
  // Customers see the conversation, not staff notes or the automatic receipt.
  const msgs = await db
    .select()
    .from(ticketMessages)
    .where(and(eq(ticketMessages.ticketId, t.id), inArray(ticketMessages.kind, ["reply", "customer"])))
    .orderBy(asc(ticketMessages.createdAt));
  await db.update(feedback).set({ customerSeenAt: new Date() }).where(eq(feedback.id, t.id));
  const closed = isPastReopenWindow(t);
  const [chip, label] = closed ? (["neutral", "Closed"] as const) : (STATUS[t.status] ?? ["neutral", t.status]);

  return (
    <div className="shell has-mnav">
      <AppTopBar />
      <HomeNav />
      <main className="page" style={{ maxWidth: 760 }}>
        <Link href="/app/feedback" className="adm-back">
          ← Support &amp; feedback
        </Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap", margin: "4px 0 14px" }}>
          <div>
            <div className="muted" style={{ fontSize: 13 }}>
              {TICKET_KIND_LABEL[t.kind] ?? t.kind}
              {t.topic ? ` · ${CONTACT_TOPICS.find((x) => x.id === t.topic)?.label ?? t.topic}` : ""} · {when(t.createdAt)}
            </div>
            <h1 style={{ fontSize: 22, margin: "2px 0 0" }}>{ticketCode(t.number)}</h1>
          </div>
          <span className={`chip ${chip}`}>
            <span className="dot" />
            {label}
          </span>
        </div>
        {t.followUpOf && (
          <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
            Follow-up to <Link href={`/app/feedback/${t.followUpOf}`}>{ticketCode(t.followUpOf)}</Link>
          </p>
        )}
        <div className="adm-thread">
          <article className="adm-msg customer">
            <div className="adm-msg-head">
              <b>You</b>
              <span className="muted">{when(t.createdAt)}</span>
            </div>
            <p>{t.message}</p>
          </article>
          {msgs.map((m) => (
            <article key={m.id} className={`adm-msg ${m.kind === "reply" ? "reply" : "customer"}`}>
              <div className="adm-msg-head">
                <b>{m.kind === "reply" ? `KeyStub support · ${m.authorName?.split(/\s+/)[0] ?? "Team"}` : "You"}</b>
                <span className="muted">{when(m.createdAt)}</span>
              </div>
              <p>{m.body}</p>
            </article>
          ))}
          {msgs.every((m) => m.kind !== "reply") && !closed && t.status !== "done" && (
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>
              We&apos;ve got your message and will reply here and by email, usually within one business day.
            </p>
          )}
          <MyTicketActions number={t.number} status={t.status} closed={closed} reopenDays={REOPEN_DAYS} />
        </div>
      </main>
    </div>
  );
}
