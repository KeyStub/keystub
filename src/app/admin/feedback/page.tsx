import { and, count, desc, eq, inArray, type SQL } from "drizzle-orm";
import Link from "next/link";
import { AppTopBar } from "@/components/app-top-bar";
import { AdminFeedbackControls } from "@/components/feedback";
import { db } from "@/db";
import { feedback } from "@/db/schema";
import { CONTACT_TOPICS, FEEDBACK_KINDS, FEEDBACK_STATUSES } from "@/lib/admin";

export const metadata = { title: "Feedback inbox" };

const OPEN = ["new", "planned", "in_progress"];
const KIND_LABEL: Record<string, string> = { ...Object.fromEntries(FEEDBACK_KINDS.map((k) => [k.id, `${k.emoji} ${k.label}`])), contact: "✉️ Contact form" };

export default async function FeedbackInbox({ searchParams }: PageProps<"/admin/feedback">) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "open";
  const kind = typeof sp.kind === "string" ? sp.kind : "all";
  const where: SQL[] = [];
  if (status === "open") where.push(inArray(feedback.status, OPEN));
  else if (status !== "all") where.push(eq(feedback.status, status));
  if (kind !== "all") where.push(eq(feedback.kind, kind));
  const [items, counts] = await Promise.all([
    db
      .select()
      .from(feedback)
      .where(where.length ? and(...where) : undefined)
      .orderBy(desc(feedback.createdAt))
      .limit(200),
    db.select({ status: feedback.status, n: count() }).from(feedback).groupBy(feedback.status),
  ]);
  const n = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;
  const openCount = OPEN.reduce((t, s) => t + n(s), 0);
  const link = (patch: Record<string, string>) => {
    const q = new URLSearchParams({ status, kind, ...patch });
    return `/admin/feedback?${q}`;
  };

  return (
    <div className="shell">
      <AppTopBar />
      <main className="page">
        <div className="toolbar">
          <div className="grow">
            <div className="muted" style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>
              KeyStub Admin
            </div>
            <h1 style={{ fontSize: 22, margin: 0 }}>Feedback inbox</h1>
          </div>
        </div>
        <div className="fb-filters">
          {[["open", `Open (${openCount})`], ...FEEDBACK_STATUSES.map((s) => [s.id, `${s.label} (${n(s.id)})`]), ["all", "All"]].map(([id, label]) => (
            <Link key={id} href={link({ status: id })} className={`btn sm ${status === id ? "primary" : "ghost"}`}>
              {label}
            </Link>
          ))}
        </div>
        <div className="fb-filters">
          {[["all", "All types"], ...Object.entries(KIND_LABEL)].map(([id, label]) => (
            <Link key={id} href={link({ kind: id })} className={`btn sm ${kind === id ? "primary" : "ghost"}`}>
              {label}
            </Link>
          ))}
        </div>
        {items.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 32 }}>
            <p className="muted" style={{ margin: 0 }}>
              Nothing here. 🎉
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {items.map((f) => (
              <article className="card fb-item" key={f.id}>
                <div className="fb-item-head">
                  <span className="fb-kind">{KIND_LABEL[f.kind] ?? f.kind}</span>
                  {f.topic && <span className="muted">· {CONTACT_TOPICS.find((t) => t.id === f.topic)?.label ?? f.topic}</span>}
                  <span className="muted" style={{ marginLeft: "auto", fontSize: 12.5 }}>
                    {f.createdAt.toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </div>
                <p className="fb-msg">{f.message}</p>
                <div className="fb-meta">
                  <span>
                    {f.name ? `${f.name} · ` : ""}
                    <a href={`mailto:${f.email}?subject=${encodeURIComponent("Re: your KeyStub " + (f.kind === "contact" ? "message" : f.kind))}`}>{f.email}</a>
                    {f.userId ? " · has an account" : ""}
                  </span>
                  {f.page && <span>Page: {f.page}</span>}
                </div>
                <AdminFeedbackControls id={f.id} status={f.status} adminNote={f.adminNote} />
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
