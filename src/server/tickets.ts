import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { emailTemplates, ticketMessages } from "@/db/schema";
import { adminUrl, DEFAULT_TEMPLATES, fillTemplate, stripQuotedReply, SUPPORT_EMAIL, TEMPLATE_KEYS, TICKET_KIND_LABEL, ticketCode, ticketNumberFrom, ticketReplyTo, type TemplateKey } from "@/lib/admin";
import { sendEmail, supportFrom } from "./mailer";

/** A template from the database, or the built-in default if it was never edited. */
export async function getTemplate(key: TemplateKey) {
  const [row] = await db.select().from(emailTemplates).where(eq(emailTemplates.key, key));
  return row ? { subject: row.subject, body: row.body, enabled: row.enabled, edited: true } : { ...DEFAULT_TEMPLATES[key], enabled: true, edited: false };
}

export type NewTicket = {
  id: string;
  number: number;
  kind: string;
  name: string | null;
  email: string;
  message: string;
  topic?: string | null;
  page?: string | null;
  /** e.g. "signed in, free plan" */
  context?: string | null;
  /** the ticket belongs to a KeyStub account, so it can be viewed in the app */
  hasAccount?: boolean;
};

/** After a ticket is saved: auto-reply to the customer and notify the support inbox. Never throws. */
export async function afterTicketCreated(t: NewTicket) {
  const code = ticketCode(t.number);
  const key = TEMPLATE_KEYS.find((k) => k.kind === t.kind)?.key;
  if (key) {
    const tpl = await getTemplate(key);
    if (tpl.enabled) {
      const vars = { name: t.name, ticket: code, message: t.message, link: t.hasAccount ? ticketLink(t.number) : "" };
      const subject = fillTemplate(tpl.subject, vars);
      const body = fillTemplate(tpl.body, vars);
      let status = "sent";
      try {
        await sendEmail({ to: t.email, from: supportFrom(), replyTo: ticketReplyTo(t.number), subject, text: body });
      } catch (e) {
        status = "failed";
        console.error("auto-reply failed", e);
      }
      await db.insert(ticketMessages).values({ ticketId: t.id, kind: "auto_reply", body: `Subject: ${subject}\n\n${body}`, authorName: "Auto-reply", emailStatus: status });
    }
  }
  try {
    await sendEmail({
      to: SUPPORT_EMAIL(),
      replyTo: t.email,
      subject: `[${code}] ${TICKET_KIND_LABEL[t.kind]?.replace(/^\S+\s/, "") ?? t.kind}: ${t.message.slice(0, 60).replace(/\s+/g, " ")}`,
      text: [
        `New ticket ${code} from ${t.name ? `${t.name} <${t.email}>` : t.email}${t.context ? ` (${t.context})` : ""}`,
        t.topic ? `Topic: ${t.topic}` : null,
        t.page ? `Page: ${t.page}` : null,
        "",
        t.message,
        "",
        `Open it in KeyStub Admin: ${adminUrl(`/admin/tickets/${t.number}`)}`,
      ]
        .filter((l) => l != null)
        .join("\n"),
    });
  } catch (e) {
    console.error("support notification failed", e);
  }
}

/* ---------------- incoming email (Resend inbound) ---------------- */

export type InboundEmail = {
  from: string;
  to: string[];
  subject: string;
  text: string | null;
  html: string | null;
  attachments: number;
  headers?: Record<string, string> | null;
};

const htmlToText = (html: string) =>
  html
    .replace(/<(br|\/p|\/div|\/li)\s*\/?>/gi, "\n")
    .replace(/<blockquote[\s\S]*?<\/blockquote>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"');

function parseAddress(raw: string) {
  const m = raw.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  return m ? { name: m[1].trim() || null, email: m[2].trim().toLowerCase() } : { name: null, email: raw.trim().toLowerCase() };
}

/** Our own domains: mail from these is never turned into tickets (stops notification loops). */
const OWN_DOMAINS = () =>
  (process.env.OWN_EMAIL_DOMAINS || "keystub.com,keystub.ca")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

/**
 * A customer's email: a reply to a ticket (support+ks1001@… or "[#KS1001]" in the subject) is
 * added to that ticket and puts it back to "Needs reply"; anything else becomes a new ticket.
 */
export async function processInboundEmail(e: InboundEmail): Promise<{ result: "reply" | "ticket" | "ignored"; number?: number }> {
  const { feedback, user } = await import("@/db/schema");
  const from = parseAddress(e.from);
  const domain = from.email.split("@")[1] ?? "";
  const auto = e.headers && Object.entries(e.headers).find(([k]) => k.toLowerCase() === "auto-submitted")?.[1];
  if (!from.email.includes("@") || OWN_DOMAINS().includes(domain) || (auto && auto.toLowerCase() !== "no")) return { result: "ignored" };

  const body = stripQuotedReply(e.text ?? (e.html ? htmlToText(e.html) : "")) || "(no message text)";
  const attachNote = e.attachments ? `${e.attachments} attachment${e.attachments === 1 ? "" : "s"} (open them in Resend, under Emails, Receiving)` : null;
  const n = ticketNumberFrom(e.to, e.subject);
  const [existing] = n ? await db.select().from(feedback).where(eq(feedback.number, n)) : [];

  if (existing) {
    const r = await addCustomerReply(existing, { body, name: from.name || from.email, attachNote });
    return { result: r.followUp ? "ticket" : "reply", number: r.number };
  }

  const [account] = await db.select({ id: user.id, name: user.name }).from(user).where(eq(user.email, from.email));
  const message = `${e.subject?.trim() ? `${e.subject.trim()}\n\n` : ""}${body}`.slice(0, 10000);
  const [t] = await db
    .insert(feedback)
    .values({ userId: account?.id ?? null, email: from.email, name: from.name || account?.name || null, kind: "email", message, userAgent: null })
    .returning({ id: feedback.id, number: feedback.number });
  if (attachNote) await db.insert(ticketMessages).values({ ticketId: t.id, kind: "note", body: `Customer's email had ${attachNote}.`, authorName: "System" });
  await afterTicketCreated({ ...t, kind: "email", name: from.name || account?.name || null, email: from.email, message, context: account ? "has an account" : "emailed support", hasAccount: !!account });
  return { result: "ticket", number: t.number };
}

/* ---------------- customer replies (email or app) ---------------- */

/** Days a resolved ticket can still be reopened by a reply. After that (or once Closed), a reply starts a follow-up ticket. */
export const REOPEN_DAYS = 14;

type TicketRow = {
  id: string;
  number: number;
  kind: string;
  status: string;
  updatedAt: Date;
  userId: string | null;
  email: string;
  name: string | null;
  topic: string | null;
  category: string | null;
};

export function isPastReopenWindow(t: { status: string; updatedAt: Date }, now = Date.now()) {
  return t.status === "closed" || (t.status === "done" && now - t.updatedAt.getTime() > REOPEN_DAYS * 86_400_000);
}

/**
 * The customer wrote back. Open or recently resolved tickets get the message and go back to
 * "Needs reply"; closed (or long-resolved) ones get a new follow-up ticket that links to the old one.
 */
export async function addCustomerReply(
  t: TicketRow,
  m: { body: string; name: string; authorId?: string | null; attachNote?: string | null },
): Promise<{ number: number; followUp: boolean }> {
  const { feedback } = await import("@/db/schema");
  if (isPastReopenWindow(t)) {
    const message = `Follow-up to ${ticketCode(t.number)}:\n\n${m.body}`.slice(0, 10000);
    const [n] = await db
      .insert(feedback)
      .values({ userId: t.userId, email: t.email, name: t.name, kind: t.kind, topic: t.topic, category: t.category, message, followUpOf: t.number })
      .returning({ id: feedback.id, number: feedback.number });
    if (m.attachNote) await db.insert(ticketMessages).values({ ticketId: n.id, kind: "note", body: `Customer's email had ${m.attachNote}.`, authorName: "System" });
    await afterTicketCreated({ ...n, kind: t.kind, name: t.name, email: t.email, message, topic: t.topic, context: `follow-up to ${ticketCode(t.number)}`, hasAccount: !!t.userId });
    return { number: n.number, followUp: true };
  }
  await db.insert(ticketMessages).values({ ticketId: t.id, kind: "customer", body: m.body, authorId: m.authorId ?? null, authorName: m.name, emailStatus: m.attachNote ?? null });
  await db.update(feedback).set({ status: "new", updatedAt: new Date() }).where(eq(feedback.id, t.id));
  try {
    await sendEmail({
      to: SUPPORT_EMAIL(),
      replyTo: t.email,
      subject: `[${ticketCode(t.number)}] New reply from ${m.name}`,
      text: `${m.name} replied to ${ticketCode(t.number)}:\n\n${m.body}\n\nAnswer it in KeyStub Admin: ${adminUrl(`/admin/tickets/${t.number}`)}`,
    });
  } catch (err) {
    console.error("reply notification failed", err);
  }
  return { number: t.number, followUp: false };
}

/** Customer-facing link to a ticket (only useful when the ticket belongs to an account). */
export const ticketLink = (n: number) => `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/app/feedback/${n}`;
