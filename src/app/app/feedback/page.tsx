import { desc, eq } from "drizzle-orm";
import { Suspense } from "react";
import { AppTopBar } from "@/components/app-top-bar";
import { FeedbackForm } from "@/components/feedback";
import { HomeNav } from "@/components/home-nav";
import { db } from "@/db";
import { feedback } from "@/db/schema";
import { FEEDBACK_KINDS, FEEDBACK_STATUSES, ticketCode } from "@/lib/admin";
import { fmtDate } from "@/lib/format";
import { requireUser } from "@/server/session";

export const metadata = { title: "Send feedback" };

const STATUS_CHIP: Record<string, string> = { new: "neutral", planned: "warning", in_progress: "warning", done: "good", closed: "neutral" };

export default async function FeedbackPage() {
  const user = await requireUser();
  const mine = await db
    .select({ id: feedback.id, number: feedback.number, kind: feedback.kind, message: feedback.message, status: feedback.status, createdAt: feedback.createdAt })
    .from(feedback)
    .where(eq(feedback.userId, user.id))
    .orderBy(desc(feedback.createdAt))
    .limit(30);
  return (
    <div className="shell has-mnav">
      <AppTopBar />
      <HomeNav />
      <main className="page" style={{ maxWidth: 760 }}>
        <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>Send feedback</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Found a bug, have an idea, or stuck on something? Tell us. KeyStub is built around what drivers ask for.
        </p>
        <Suspense>
          <FeedbackForm />
        </Suspense>
        {mine.length > 0 && (
          <>
            <h3 className="section-title">Your feedback</h3>
            <div className="card" style={{ padding: 0 }}>
              <div className="list">
                {mine.map((f) => {
                  const k = FEEDBACK_KINDS.find((x) => x.id === f.kind);
                  const st = FEEDBACK_STATUSES.find((x) => x.id === f.status);
                  return (
                    <div className="list-item" key={f.id} style={{ padding: "12px 16px", alignItems: "flex-start" }}>
                      <div className="l-main">
                        <div className="l-title" style={{ fontWeight: 500 }}>
                          {k ? `${k.emoji} ` : ""}
                          {f.message.length > 140 ? f.message.slice(0, 140) + "…" : f.message}
                        </div>
                        <div className="l-sub">
                          {ticketCode(f.number)} · {k?.label ?? "Message"} · {fmtDate(f.createdAt.toISOString().slice(0, 10))}
                        </div>
                      </div>
                      <span className={`chip ${STATUS_CHIP[f.status] ?? "neutral"}`}>
                        <span className="dot" />
                        {f.status === "new" ? "Received" : (st?.label ?? f.status)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
        <p className="muted" style={{ fontSize: 13, marginTop: 16 }}>
          Need help with your account or billing? Email <a href="mailto:support@keystub.com">support@keystub.com</a>.
        </p>
      </main>
    </div>
  );
}
