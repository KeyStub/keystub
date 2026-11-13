/* KeyStub Admin: constants shared by the server and the admin screens. */

export const SUPPORT_EMAIL = () => process.env.SUPPORT_EMAIL || "support@keystub.com";

/* ---------- where Admin lives ---------- */

/** e.g. "admin.keystub.com". When set, Admin is served from that host and its URLs drop the /admin prefix. */
export const ADMIN_HOST = process.env.NEXT_PUBLIC_ADMIN_HOST || "";
const adminProto = () => (/localhost|127\.0\.0\.1/.test(ADMIN_HOST) ? "http" : "https");
/** Link inside Admin: "/admin/tickets" → "/tickets" on the admin host, unchanged otherwise. */
export const adminPath = (p: string) => (ADMIN_HOST ? p.replace(/^\/admin(?=\/|$|\?)/, "") || "/" : p);
/** Absolute Admin URL, for emails and cross-site redirects. */
export const adminUrl = (p: string) =>
  ADMIN_HOST ? `${adminProto()}://${ADMIN_HOST}${adminPath(p)}` : `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}${p}`;

/* ---------- replies by email ---------- */

/** Domain that receives email for KeyStub (Resend inbound), e.g. "inbox.keystub.com". Empty = replies go to the support inbox. */
export const INBOUND_DOMAIN = () => process.env.INBOUND_DOMAIN || "";
/** Reply-To for a ticket: support+ks1001@inbox.keystub.com (falls back to the support address). */
export const ticketReplyTo = (n: number) => (INBOUND_DOMAIN() ? `support+ks${n}@${INBOUND_DOMAIN()}` : SUPPORT_EMAIL());
/**
 * True when an address is one of our support inboxes: support@ or support+anything@ at our own
 * domains or the inbound domain. Mail forwarded from a shared Gmail inbox keeps its original To/Cc,
 * so this tells real support mail apart from other mail (e.g. to accounts@) that got forwarded too.
 */
export function isSupportAddress(raw: string, domains: string[]) {
  const email = (raw.match(/<([^>]+)>/)?.[1] ?? raw).trim().toLowerCase();
  const [local, domain] = email.split("@");
  if (!local || !domain) return false;
  const support = SUPPORT_EMAIL().toLowerCase();
  return email === support || ((local === "support" || local.startsWith("support+")) && domains.includes(domain));
}
/** Ticket number from a reply address (support+ks1001@…) or subject ("Re: [#KS1001] …"). */
export function ticketNumberFrom(to: string[], subject: string) {
  for (const t of to) {
    const m = t.match(/\+ks-?(\d{1,9})@/i);
    if (m) return Number(m[1]);
  }
  const s = subject.match(/#\s?KS-?(\d{1,9})/i);
  return s ? Number(s[1]) : null;
}
/** The new part of an emailed reply: drops quoted history and common signatures. */
export function stripQuotedReply(text: string) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if (/^\s*>/.test(line)) break;
    if (/^\s*On .+(wrote|écrit)\s*:?\s*$/i.test(line)) break;
    if (/^\s*-{2,}\s*Original Message\s*-{2,}/i.test(line)) break;
    if (/^\s*From:\s.+/i.test(line) && out.length) break;
    if (/^\s*Sent from my (iPhone|iPad|Android|phone)/i.test(line)) break;
    if (/^\s*—\s*$/.test(line)) break; // our own sign-off separator
    out.push(line);
  }
  return out.join("\n").trim();
}

/** "#KS1001" */
export const ticketCode = (n: number) => `#KS${n}`;
/** Accepts "1001", "KS1001", "#KS1001", "#ks-1001". */
export const parseTicketCode = (s: string) => {
  const m = s.trim().match(/^#?\s*(?:ks)?-?\s*(\d{1,9})$/i);
  return m ? Number(m[1]) : null;
};

/* ---------- staff roles ---------- */

export type StaffRole = "owner" | "admin" | "support";
export type Permission = "tickets" | "customers" | "templates" | "staff";

export const ROLES: { id: StaffRole; label: string; description: string; can: Permission[] }[] = [
  { id: "owner", label: "Owner", description: "Everything, including adding and removing staff.", can: ["tickets", "customers", "templates", "staff"] },
  { id: "admin", label: "Admin", description: "Tickets, customers and auto-reply emails. Can't manage staff.", can: ["tickets", "customers", "templates"] },
  { id: "support", label: "Support", description: "Answer tickets and look up customers.", can: ["tickets", "customers"] },
];

export const can = (role: StaffRole | null | undefined, p: Permission) => !!role && !!ROLES.find((r) => r.id === role)?.can.includes(p);

/* ---------- tickets ---------- */

export const FEEDBACK_KINDS = [
  { id: "bug", label: "Bug", emoji: "🐞", hint: "Something isn't working right" },
  { id: "idea", label: "Idea", emoji: "💡", hint: "A feature or improvement you'd like" },
  { id: "question", label: "Question", emoji: "❓", hint: "Not sure how something works" },
  { id: "other", label: "Other", emoji: "💬", hint: "Anything else on your mind" },
] as const;

export const TICKET_KIND_LABEL: Record<string, string> = {
  ...Object.fromEntries(FEEDBACK_KINDS.map((k) => [k.id, `${k.emoji} ${k.label}`])),
  contact: "✉️ Contact form",
  email: "📨 Email",
};

export const CONTACT_TOPICS = [
  { id: "support", label: "Help with my account" },
  { id: "billing", label: "Billing or plans" },
  { id: "partnership", label: "Partnership or creator collaboration" },
  { id: "press", label: "Press" },
  { id: "other", label: "Something else" },
] as const;

export const FEEDBACK_STATUSES = [
  { id: "new", label: "Needs reply" },
  { id: "in_progress", label: "In progress" },
  { id: "planned", label: "Planned" },
  { id: "done", label: "Done" },
  { id: "closed", label: "Closed" },
] as const;
export const OPEN_STATUSES = ["new", "in_progress", "planned"];

/* ---------- auto-reply emails ---------- */

export const TEMPLATE_KEYS = [
  { key: "auto_bug", label: "Bug report", kind: "bug" },
  { key: "auto_idea", label: "Feature idea", kind: "idea" },
  { key: "auto_question", label: "Question", kind: "question" },
  { key: "auto_other", label: "Other feedback", kind: "other" },
  { key: "auto_contact", label: "Contact form", kind: "contact" },
  { key: "auto_email", label: "Email to support", kind: "email" },
] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number]["key"];

export const TEMPLATE_PLACEHOLDERS = [
  ["{name}", "the person's first name (or “there”)"],
  ["{ticket}", "the ticket number, e.g. #KS1001"],
  ["{message}", "a copy of what they wrote"],
  ["{link}", "a link to view and reply to the ticket in KeyStub (the line is left out if they have no account)"],
] as const;

const SIGN_OFF = "\n\nThanks,\nThe KeyStub team\nsupport@keystub.com";

export const DEFAULT_TEMPLATES: Record<TemplateKey, { subject: string; body: string }> = {
  auto_bug: {
    subject: "We got your bug report ({ticket})",
    body: `Hi {name},\n\nThanks for reporting this. Your ticket number is {ticket}. We'll look into it and email you if we need more details or once it's fixed.\n\nFollow it or add details here: {link}\n\nWhat you sent:\n{message}${SIGN_OFF}`,
  },
  auto_idea: {
    subject: "Thanks for your idea ({ticket})",
    body: `Hi {name},\n\nThanks for the suggestion! Every idea is read and helps decide what we build next. You can follow its status here: {link}\n\nYour idea ({ticket}):\n{message}${SIGN_OFF}`,
  },
  auto_question: {
    subject: "We got your question ({ticket})",
    body: `Hi {name},\n\nThanks for reaching out. Your ticket number is {ticket}, and a real person will reply, usually within one business day.\n\nView or add to it here: {link}\n\nYour question:\n{message}${SIGN_OFF}`,
  },
  auto_other: {
    subject: "Thanks for your feedback ({ticket})",
    body: `Hi {name},\n\nThanks for taking the time to write to us. Your message is ticket {ticket}, and we'll reply if there's anything to follow up on.\n\nView it here: {link}\n\nWhat you sent:\n{message}${SIGN_OFF}`,
  },
  auto_email: {
    subject: "We got your email ({ticket})",
    body: `Hi {name},

Thanks for emailing KeyStub. Your message is ticket {ticket}, and a real person will reply, usually within one business day. Just reply to this email if you have anything to add.${SIGN_OFF}`,
  },
  auto_contact: {
    subject: "We got your message ({ticket})",
    body: `Hi {name},\n\nThanks for contacting KeyStub. Your message is ticket {ticket}. We usually reply within one business day. Just reply to this email if you have anything to add.\n\nYour message:\n{message}${SIGN_OFF}`,
  },
};

export function fillTemplate(text: string, v: { name?: string | null; ticket: string; message: string; link?: string }) {
  const first = v.name?.trim().split(/\s+/)[0] || "there";
  // Lines with {link} are dropped when there's no link (e.g. the person has no KeyStub account).
  const t = v.link ? text : text.split("\n").filter((l) => !l.includes("{link}")).join("\n");
  return t.replaceAll("{name}", first).replaceAll("{ticket}", v.ticket).replaceAll("{message}", v.message).replaceAll("{link}", v.link ?? "");
}

/* ---------- notification emails to the support inbox ---------- */

export type NotifySettings = { newTicket: boolean; customerReply: boolean };
export const DEFAULT_NOTIFY: NotifySettings = { newTicket: true, customerReply: true };
