"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CONTACT_TOPICS, FEEDBACK_KINDS, FEEDBACK_STATUSES } from "@/lib/admin";
import { submitContact, submitFeedback, updateFeedback } from "@/server/actions";
import { useToast } from "./ui";

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
  const [sent, setSent] = useState(false);
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
    setSent(true);
    router.refresh();
  }

  if (sent)
    return (
      <div className="card fb-thanks">
        <div className="fb-thanks-ic" aria-hidden="true">
          ✓
        </div>
        <h2>Thanks, we got it!</h2>
        <p className="muted">
          Every message is read. {kind === "bug" || kind === "question" ? "If we need more details or have an answer, we'll email you." : "We'll update its status below as plans change."}
        </p>
        <button className="btn" onClick={() => setSent(false)}>
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
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await submitContact({ ...Object.fromEntries(new FormData(e.currentTarget)), t: shownAt });
    setBusy(false);
    if (!res.ok) return setError("error" in res ? res.error : "Couldn't send your message. Please email support@keystub.com.");
    setSent(true);
  }

  if (sent)
    return (
      <div className="mk-contact-card mk-contact-done">
        <h2>Message sent</h2>
        <p>Thanks for reaching out. We usually reply within one business day, from support@keystub.com.</p>
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

/** KeyStub Admin: one feedback item with status + private note. */
export function AdminFeedbackControls({ id, status, adminNote }: { id: string; status: string; adminNote: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const [s, setS] = useState(status);
  const [note, setNote] = useState(adminNote ?? "");
  const [busy, setBusy] = useState(false);
  const dirty = s !== status || note !== (adminNote ?? "");
  return (
    <div className="fb-admin-controls">
      <select className="select inline" value={s} onChange={(e) => setS(e.target.value)} aria-label="Status">
        {FEEDBACK_STATUSES.map((x) => (
          <option key={x.id} value={x.id}>
            {x.label}
          </option>
        ))}
      </select>
      <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Private note (only you see this)" maxLength={2000} />
      <button
        className="btn sm"
        disabled={!dirty || busy}
        onClick={async () => {
          setBusy(true);
          const res = await updateFeedback(id, { status: s, adminNote: note });
          setBusy(false);
          if (!res.ok) return toast("error" in res ? res.error : "Couldn't save.", true);
          toast("Saved.");
          router.refresh();
        }}
      >
        {busy ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
