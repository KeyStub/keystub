"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CONTACT_TOPICS, FEEDBACK_KINDS, ticketCode } from "@/lib/admin";
import { replyToMyTicket, setMyTicketResolved, submitContact, submitFeedback } from "@/server/actions";

/** In-app: report a bug, suggest an idea, ask a question. */
export function FeedbackForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [kind, setKind] = useState<(typeof FEEDBACK_KINDS)[number]["id"]>(() => {
    const k = params.get("type");
    return FEEDBACK_KINDS.some((x) => x.id === k) ? (k as "bug") : "idea";
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const from = params.get("from");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError(null);
    const res = await submitFeedback({ kind, message: new FormData(form).get("message"), page: from ?? undefined });
    setBusy(false);
    if (!res.ok) return setError("error" in res ? res.error : "Couldn't send it. Please try again.");
    form.reset();
    setSent(res.id ? ticketCode(Number(res.id)) : "sent");
    router.refresh();
  }

  if (sent)
    return (
      <div className="card fb-thanks">
        <div className="fb-thanks-ic" aria-hidden="true">
          ✓
        </div>
        <h2>Thanks, we got it!</h2>
        {sent.startsWith("#") && <p style={{ margin: "0 0 6px" }}>Your ticket number is <b>{sent}</b>. We emailed you a copy.</p>}
        <p className="muted">
          Every message is read. {kind === "bug" || kind === "question" ? "If we need more details or have an answer, we'll email you." : "We'll update its status below as plans change."}
        </p>
        <button className="btn" onClick={() => setSent(null)}>
          Send something else
        </button>
      </div>
    );

  const k = FEEDBACK_KINDS.find((x) => x.id === kind)!;
  return (
    <form className="card" onSubmit={onSubmit}>
      {error && <div className="note error">{error}</div>}
      <div className="field">
        <span className="label">What&apos;s it about?</span>
        <div className="seg-choice" role="radiogroup" aria-label="Type of feedback">
          {FEEDBACK_KINDS.map((x) => (
            <label key={x.id} className={kind === x.id ? "on" : ""}>
              <input type="radio" name="kind" value={x.id} checked={kind === x.id} onChange={() => setKind(x.id)} />
              <span aria-hidden="true" style={{ marginRight: 6 }}>
                {x.emoji}
              </span>
              {x.label}
            </label>
          ))}
        </div>
        <div className="hint">{k.hint}</div>
      </div>
      <div className="field">
        <label htmlFor="fb-msg">{kind === "bug" ? "What happened, and what did you expect?" : kind === "idea" ? "What would you like KeyStub to do?" : "Your message"}</label>
        <textarea
          className="input"
          id="fb-msg"
          name="message"
          rows={6}
          required
          minLength={5}
          maxLength={5000}
          placeholder={
            kind === "bug"
              ? "e.g. On the Fuel page, saving a fill-up with no litres shows an error…"
              : kind === "idea"
                ? "e.g. I'd love a reminder when my winter tires should go on…"
                : ""
          }
        />
        {from && <div className="hint">We&apos;ll include the page you came from ({from}) to help us find the problem.</div>}
      </div>
      <button className="btn primary" disabled={busy}>
        {busy ? "Sending…" : "Send feedback"}
      </button>
    </form>
  );
}

/** Website: contact form for anyone (signed in or not). */
export function ContactForm({ defaultName, defaultEmail }: { defaultName?: string; defaultEmail?: string }) {
  const [shownAt] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await submitContact({ ...Object.fromEntries(new FormData(e.currentTarget)), t: shownAt });
    setBusy(false);
    if (!res.ok) return setError("error" in res ? res.error : "Couldn't send your message. Please email support@keystub.com.");
    setSent(res.id ? ticketCode(Number(res.id)) : "sent");
  }

  if (sent)
    return (
      <div className="mk-contact-card mk-contact-done">
        <h2>Message sent</h2>
        <p>
          Thanks for reaching out.{sent.startsWith("#") ? <> Your ticket number is <b>{sent}</b>, and we emailed you a copy.</> : null} We usually reply within one
          business day, from support@keystub.com.
        </p>
      </div>
    );

  return (
    <form className="mk-contact-card" onSubmit={onSubmit}>
      {error && <div className="mk-contact-error">{error}</div>}
      <div className="mk-contact-row">
        <label>
          Name
          <input name="name" required maxLength={120} autoComplete="name" defaultValue={defaultName} />
        </label>
        <label>
          Email
          <input name="email" type="email" required maxLength={254} autoComplete="email" defaultValue={defaultEmail} />
        </label>
      </div>
      <label>
        Topic
        <select name="topic" defaultValue="support">
          {CONTACT_TOPICS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Message
        <textarea name="message" rows={6} required minLength={10} maxLength={5000} />
      </label>
      {/* Honeypot: hidden from people, irresistible to bots. */}
      <label className="mk-hp" aria-hidden="true">
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <button className="mk-btn yellow" disabled={busy}>
        {busy ? "Sending…" : "Send message"}
      </button>
      <p className="mk-contact-note">
        Already using KeyStub? Bugs and feature ideas are easiest to send from the app: More → Send feedback.
      </p>
    </form>
  );
}

/** Customer side of a ticket: reply, mark resolved, reopen. */
export function MyTicketActions({ number, status, closed, reopenDays }: { number: number; status: string; closed: boolean; reopenDays: number }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resolved = status === "done" && !closed;

  async function send(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await replyToMyTicket(number, body);
    setBusy(false);
    if (!res.ok) return setError("error" in res ? res.error : "Couldn't send it.");
    setBody("");
    if (res.id && Number(res.id) !== number) router.push(`/app/feedback/${res.id}`);
    else router.refresh();
  }
  async function toggle(r: boolean) {
    setBusy(true);
    const res = await setMyTicketResolved(number, r);
    setBusy(false);
    if (!res.ok) return setError("error" in res ? res.error : "Couldn't update it.");
    router.refresh();
  }

  return (
    <form className="card" onSubmit={send}>
      {error && <div className="note error">{error}</div>}
      <label htmlFor="my-reply" style={{ fontWeight: 600, fontSize: 14 }}>
        {closed ? "Need more help with this?" : "Add a message"}
      </label>
      <p className="muted" style={{ fontSize: 12.5, margin: "4px 0 8px" }}>
        {closed
          ? "This ticket is closed. Sending a message starts a new follow-up ticket that links back to this one."
          : resolved
            ? `Marked as resolved. Replying within ${reopenDays} days reopens it.`
            : "We'll see it right away. You can also just reply to our email."}
      </p>
      <textarea className="input" id="my-reply" rows={4} value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} required />
      <div style={{ display: "flex", gap: 8, justifyContent: "space-between", flexWrap: "wrap", marginTop: 10 }}>
        {!closed &&
          (resolved ? (
            <button type="button" className="btn ghost" disabled={busy} onClick={() => toggle(false)}>
              Reopen ticket
            </button>
          ) : (
            <button type="button" className="btn ghost" disabled={busy} onClick={() => toggle(true)}>
              Mark as resolved
            </button>
          ))}
        <button className="btn primary" disabled={busy || !body.trim()} style={{ marginLeft: "auto" }}>
          {busy ? "Sending…" : closed ? "Start follow-up" : "Send"}
        </button>
      </div>
    </form>
  );
}
