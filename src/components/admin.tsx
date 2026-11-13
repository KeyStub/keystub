"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { adminPath, FEEDBACK_STATUSES, ROLES, TEMPLATE_PLACEHOLDERS, type StaffRole } from "@/lib/admin";
import { addCategory, addStaff, addTicketNote, deleteCategory, removeStaff, renameCategory, replyToTicket, resetTemplate, saveTemplate, setStaffPerk, setStaffRole, setTicketCategory, setTicketStatus } from "@/server/admin-actions";
import type { ActionResult } from "@/server/actions";
import { Logo } from "./logo";
import { ThemeButton } from "./theme-toggle";
import { Field, useConfirm, useToast } from "./ui";

function useRun() {
  const toast = useToast();
  const router = useRouter();
  return async (fn: () => Promise<ActionResult>, okMsg?: string) => {
    const res = await fn();
    if (!res.ok) {
      toast("error" in res ? res.error : "Something went wrong.", true);
      return false;
    }
    if (okMsg) toast(okMsg);
    router.refresh();
    return true;
  };
}

/* ---------------- shell ---------------- */

type NavItem = { href: string; label: string; badge?: number; soon?: boolean };

export function AdminShell({
  items,
  name,
  roleLabel,
  dedicated,
  children,
}: {
  items: NavItem[];
  name: string;
  roleLabel: string;
  dedicated: boolean;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();
  const home = adminPath("/admin");
  const active = (href: string) => (href === home ? path === home : path === href || path.startsWith(href + "/"));
  return (
    <div className="adm">
      <aside className="adm-side">
        <div className="adm-brand">
          <Logo size={17} tone="app" />
          <span className="adm-tag">Admin</span>
        </div>
        <nav className="adm-nav" aria-label="Admin">
          {items.map((i) =>
            i.soon ? (
              <span key={i.href} className="adm-link soon" title="Coming soon">
                {i.label}
                <span className="adm-soon">soon</span>
              </span>
            ) : (
              <Link key={i.href} href={i.href} className={`adm-link${active(i.href) ? " on" : ""}`} aria-current={active(i.href) ? "page" : undefined}>
                {i.label}
                {!!i.badge && <span className="adm-badge">{i.badge}</span>}
              </Link>
            ),
          )}
        </nav>
        <div className="adm-me">
          <div className="adm-me-name">{name}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            {roleLabel}
            {dedicated ? " · staff account" : " · personal account"}
          </div>
          <div className="adm-me-actions">
            <ThemeButton />
            {!dedicated && (
              <a href={`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/app/home`} className="btn sm ghost">
                My garage
              </a>
            )}
            <button
              className="btn sm ghost"
              onClick={async () => {
                await authClient.signOut();
                router.push("/sign-in");
                router.refresh();
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>
      <div className="adm-main">{children}</div>
    </div>
  );
}

/* ---------------- tickets ---------------- */

export function TicketStatusSelect({ id, status }: { id: string; status: string }) {
  const run = useRun();
  const [busy, setBusy] = useState(false);
  return (
    <select
      className="select inline"
      value={status}
      disabled={busy}
      aria-label="Ticket status"
      onChange={async (e) => {
        setBusy(true);
        await run(() => setTicketStatus(id, e.target.value), "Status updated.");
        setBusy(false);
      }}
    >
      {FEEDBACK_STATUSES.map((s) => (
        <option key={s.id} value={s.id}>
          {s.label}
        </option>
      ))}
    </select>
  );
}

export function TicketComposer({ ticketId, customer }: { ticketId: string; customer: string }) {
  const run = useRun();
  const [mode, setMode] = useState<"reply" | "note">("reply");
  const [body, setBody] = useState("");
  const [after, setAfter] = useState<"keep" | "done">("keep");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const ok =
      mode === "reply"
        ? await run(() => replyToTicket(ticketId, { body, status: after === "done" ? "done" : undefined }), `Reply emailed to ${customer}.`)
        : await run(() => addTicketNote(ticketId, body), "Note saved.");
    setBusy(false);
    if (ok) setBody("");
  }

  return (
    <form className={`card adm-composer ${mode}`} onSubmit={submit}>
      <div className="seg" role="tablist" aria-label="Reply or note">
        <button type="button" role="tab" aria-selected={mode === "reply"} className={mode === "reply" ? "on" : ""} onClick={() => setMode("reply")}>
          Reply to customer
        </button>
        <button type="button" role="tab" aria-selected={mode === "note"} className={mode === "note" ? "on" : ""} onClick={() => setMode("note")}>
          Internal note
        </button>
      </div>
      <p className="muted" style={{ fontSize: 12.5, margin: "8px 0" }}>
        {mode === "reply"
          ? `Emailed to ${customer} from support@keystub.com. Their reply arrives in the support inbox.`
          : "Only staff can see notes. Each note is saved separately with your name and the time."}
      </p>
      <textarea
        className="input"
        rows={mode === "reply" ? 7 : 3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={mode === "reply" ? "Hi there, thanks for…" : "e.g. Reproduced on iPhone Safari. Fix scheduled."}
        maxLength={10000}
        required
      />
      <div className="adm-composer-foot">
        {mode === "reply" && (
          <label className="check-line compact">
            <input type="checkbox" checked={after === "done"} onChange={(e) => setAfter(e.target.checked ? "done" : "keep")} /> Mark as done after sending
          </label>
        )}
        <button className="btn primary" disabled={busy || !body.trim()}>
          {busy ? (mode === "reply" ? "Sending…" : "Saving…") : mode === "reply" ? "Send reply" : "Save note"}
        </button>
      </div>
    </form>
  );
}

/* ---------------- auto-replies ---------------- */

type Tpl = { key: string; label: string; subject: string; body: string; enabled: boolean; edited: boolean; updatedBy?: string | null };

export function TemplateEditor({ tpl }: { tpl: Tpl }) {
  const run = useRun();
  const confirm = useConfirm();
  const [subject, setSubject] = useState(tpl.subject);
  const [body, setBody] = useState(tpl.body);
  const [enabled, setEnabled] = useState(tpl.enabled);
  const [busy, setBusy] = useState(false);
  const dirty = subject !== tpl.subject || body !== tpl.body || enabled !== tpl.enabled;
  return (
    <form
      className="card adm-tpl"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await run(() => saveTemplate({ key: tpl.key, subject, body, enabled }), `${tpl.label} auto-reply saved.`);
        setBusy(false);
      }}
    >
      <div className="adm-tpl-head">
        <b>{tpl.label}</b>
        <span className={`chip ${enabled ? "good" : "neutral"}`}>
          <span className="dot" />
          {enabled ? "Sending" : "Off"}
        </span>
        <span className="muted" style={{ fontSize: 12, marginLeft: "auto" }}>
          {tpl.edited ? `Edited${tpl.updatedBy ? ` by ${tpl.updatedBy}` : ""}` : "Default wording"}
        </span>
      </div>
      <label className="check-line compact" style={{ margin: "10px 0" }}>
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Send this auto-reply
      </label>
      <Field label="Subject" htmlFor={`s-${tpl.key}`}>
        <input className="input" id={`s-${tpl.key}`} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} required />
      </Field>
      <Field label="Message" htmlFor={`b-${tpl.key}`}>
        <textarea className="input" id={`b-${tpl.key}`} rows={9} value={body} onChange={(e) => setBody(e.target.value)} maxLength={10000} required />
      </Field>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
        {tpl.edited && (
          <button
            type="button"
            className="btn ghost"
            onClick={async () => {
              if (await confirm({ title: "Restore the default wording?", message: "Your edits to this auto-reply will be replaced.", confirmLabel: "Restore default" }))
                await run(() => resetTemplate(tpl.key), "Default wording restored.");
            }}
          >
            Restore default
          </button>
        )}
        <button className="btn primary" disabled={!dirty || busy}>
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

export function PlaceholderHelp() {
  return (
    <div className="note info" style={{ fontSize: 13 }}>
      Use these in the subject or message and they&apos;re filled in for each person:{" "}
      {TEMPLATE_PLACEHOLDERS.map(([k, d], i) => (
        <span key={k}>
          {i ? " · " : ""}
          <code>{k}</code> {d}
        </span>
      ))}
    </div>
  );
}

/* ---------------- staff ---------------- */

type StaffRow = { id: string; email: string; name: string | null; role: string; perkEmail: string | null; addedBy: string | null; createdAt: string; hasAccount: boolean; twoFactor: boolean };

function PerkCell({ row }: { row: StaffRow }) {
  const run = useRun();
  const [v, setV] = useState(row.perkEmail ?? "");
  const dirty = v.trim().toLowerCase() !== (row.perkEmail ?? "");
  return (
    <form
      className="perk-cell"
      onSubmit={async (e) => {
        e.preventDefault();
        await run(() => setStaffPerk(row.id, v), v.trim() ? "Team perk saved." : "Team perk removed.");
      }}
    >
      <input className="input" type="email" value={v} onChange={(e) => setV(e.target.value)} placeholder="personal@email.com" aria-label={`Personal account for ${row.email}`} />
      {dirty && <button className="btn sm">Save</button>}
    </form>
  );
}

export function StaffManager({ rows, myEmail, envOwners }: { rows: StaffRow[]; myEmail: string; envOwners: string[] }) {
  const run = useRun();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  return (
    <>
      <div className="card" style={{ padding: 0 }}>
        <table className="data">
          <thead>
            <tr>
              <th>Person</th>
              <th>Role</th>
              <th className="hide-sm">Account</th>
              <th className="hide-sm">Free Pro for personal account</th>
              <th className="num">Actions</th>
            </tr>
          </thead>
          <tbody>
            {envOwners.map((e) => (
              <tr key={e}>
                <td>
                  <b>{e}</b>
                  <div className="muted" style={{ fontSize: 12 }}>
                    Set in Vercel (ADMIN_EMAILS)
                  </div>
                </td>
                <td>Owner</td>
                <td className="hide-sm">—</td>
                <td className="hide-sm muted" style={{ fontSize: 12 }}>Owners: use FOUNDER_EMAILS</td>
                <td className="num muted" style={{ fontSize: 12 }}>
                  Change in Vercel
                </td>
              </tr>
            ))}
            {rows.map((r) => {
              const me = r.email.toLowerCase() === myEmail.toLowerCase();
              return (
                <tr key={r.id}>
                  <td>
                    <b>{r.name || r.email}</b>
                    {r.name && <div style={{ fontSize: 12.5 }}>{r.email}</div>}
                    <div className="muted" style={{ fontSize: 12 }}>
                      Added {r.createdAt}
                      {r.addedBy ? ` by ${r.addedBy}` : ""}
                    </div>
                  </td>
                  <td>
                    <select
                      className="select inline"
                      value={r.role}
                      disabled={me}
                      onChange={(e) => run(() => setStaffRole(r.id, e.target.value), "Role updated.")}
                      aria-label={`Role for ${r.email}`}
                    >
                      {ROLES.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="hide-sm" style={{ fontSize: 12.5 }}>
                    {r.hasAccount ? (r.twoFactor ? "✓ Active, 2-step on" : "Signed up, 2-step pending") : "Invited, not signed up yet"}
                  </td>
                  <td className="hide-sm">
                    <PerkCell row={r} />
                  </td>
                  <td className="num">
                    {!me && (
                      <button
                        className="btn sm ghost"
                        onClick={async () => {
                          const ok = await confirm({
                            title: `Remove ${r.name || r.email}?`,
                            message: "They lose access to KeyStub Admin immediately. Their account isn't deleted.",
                            confirmLabel: "Remove access",
                            danger: true,
                            checkbox: "I understand this person will no longer be able to open KeyStub Admin.",
                          });
                          if (ok) await run(() => removeStaff(r.id), "Access removed.");
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h3 className="section-title">Add a team member</h3>
      <form
        className="card"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          setBusy(true);
          const ok = await run(() => addStaff(Object.fromEntries(new FormData(form))), "Added. We emailed them how to get set up.");
          setBusy(false);
          if (ok) form.reset();
        }}
      >
        <div className="row2">
          <Field label="Work email" htmlFor="st-email" hint="Use a work address (e.g. name@keystub.com), not their personal one.">
            <input className="input" id="st-email" name="email" type="email" required />
          </Field>
          <Field label="Name" htmlFor="st-name">
            <input className="input" id="st-name" name="name" maxLength={120} />
          </Field>
        </div>
        <Field label="Personal KeyStub account (optional)" htmlFor="st-perk" hint="Team perk: this account gets Pro free while they work here, and goes back to normal automatically if they're removed.">
          <input className="input" id="st-perk" name="perkEmail" type="email" placeholder="their personal email" />
        </Field>
        <Field label="Role" htmlFor="st-role">
          <select className="select" id="st-role" name="role" defaultValue="support">
            {ROLES.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}: {x.description}
              </option>
            ))}
          </select>
        </Field>
        <button className="btn primary" disabled={busy}>
          {busy ? "Adding…" : "Add and send invite"}
        </button>
      </form>
    </>
  );
}

export type { StaffRole };

/* ---------------- categories ---------------- */

export function TicketCategorySelect({ id, category, options }: { id: string; category: string | null; options: string[] }) {
  const run = useRun();
  const [busy, setBusy] = useState(false);
  const all = category && !options.includes(category) ? [category, ...options] : options;
  return (
    <select
      className="select inline"
      value={category ?? ""}
      disabled={busy}
      aria-label="Ticket category"
      onChange={async (e) => {
        setBusy(true);
        await run(() => setTicketCategory(id, e.target.value), e.target.value ? "Category set." : "Category cleared.");
        setBusy(false);
      }}
    >
      <option value="">No category</option>
      {all.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}

export function CategoryManager({ rows }: { rows: { id: string; name: string; tickets: number }[] }) {
  const run = useRun();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <div className="card" style={{ padding: 0 }}>
        <div className="list">
          {rows.map((r) => (
            <div className="list-item" key={r.id} style={{ padding: "10px 16px" }}>
              {editing === r.id ? (
                <form
                  style={{ display: "flex", gap: 8, flex: 1 }}
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (await run(() => renameCategory(r.id, name), "Renamed. Tickets moved with it.")) setEditing(null);
                  }}
                >
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus required />
                  <button className="btn sm primary">Save</button>
                  <button type="button" className="btn sm ghost" onClick={() => setEditing(null)}>
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <div className="l-main">
                    <div className="l-title">{r.name}</div>
                    <div className="l-sub">
                      {r.tickets} ticket{r.tickets === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      className="btn sm ghost"
                      onClick={() => {
                        setName(r.name);
                        setEditing(r.id);
                      }}
                    >
                      Rename
                    </button>
                    <button
                      className="btn sm ghost"
                      onClick={async () => {
                        if (
                          await confirm({
                            title: `Remove “${r.name}”?`,
                            message: "It disappears from the picker. Tickets already in it keep the label, so past reports still add up.",
                            confirmLabel: "Remove",
                            danger: true,
                          })
                        )
                          await run(() => deleteCategory(r.id), "Category removed.");
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
      <form
        className="place-add"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          setBusy(true);
          const ok = await run(() => addCategory(new FormData(form).get("name")), "Category added.");
          setBusy(false);
          if (ok) form.reset();
        }}
      >
        <input className="input" name="name" placeholder="New category, e.g. EV charging" maxLength={80} required />
        <button className="btn" disabled={busy}>
          Add
        </button>
      </form>
    </>
  );
}
