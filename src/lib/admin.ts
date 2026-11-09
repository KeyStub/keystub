/* KeyStub Admin: constants shared by the server and the admin screens. */

export const SUPPORT_EMAIL = () => process.env.SUPPORT_EMAIL || "support@keystub.com";

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
};

export const CONTACT_TOPICS = [
  { id: "support", label: "Help with my account" },
  { id: "billing", label: "Billing or plans" },
  { id: "partnership", label: "Partnership or creator collaboration" },
  { id: "press", label: "Press" },
  { id: "other", label: "Something else" },
] as const;

export const FEEDBACK_STATUSES = [
  { id: "new", label: "New" },
  { id: "in_progress", label: "Open" },
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
] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number]["key"];

export const TEMPLATE_PLACEHOLDERS = [
  ["{name}", "the person's first name (or “there”)"],
  ["{ticket}", "the ticket number, e.g. #KS1001"],
  ["{message}", "a copy of what they wrote"],
] as const;

const SIGN_OFF = "\n\nThanks,\nThe KeyStub team\nsupport@keystub.com";

export const DEFAULT_TEMPLATES: Record<TemplateKey, { subject: string; body: string }> = {
  auto_bug: {
    subject: "We got your bug report ({ticket})",
    body: `Hi {name},\n\nThanks for reporting this. Your ticket number is {ticket}. We'll look into it and email you if we need more details or once it's fixed.\n\nWhat you sent:\n{message}${SIGN_OFF}`,
  },
  auto_idea: {
    subject: "Thanks for your idea ({ticket})",
    body: `Hi {name},\n\nThanks for the suggestion! Every idea is read and helps decide what we build next. You can follow its status in the app under Send feedback.\n\nYour idea ({ticket}):\n{message}${SIGN_OFF}`,
  },
  auto_question: {
    subject: "We got your question ({ticket})",
    body: `Hi {name},\n\nThanks for reaching out. Your ticket number is {ticket}, and a real person will reply, usually within one business day.\n\nYour question:\n{message}${SIGN_OFF}`,
  },
  auto_other: {
    subject: "Thanks for your feedback ({ticket})",
    body: `Hi {name},\n\nThanks for taking the time to write to us. Your message is ticket {ticket}, and we'll reply if there's anything to follow up on.\n\nWhat you sent:\n{message}${SIGN_OFF}`,
  },
  auto_contact: {
    subject: "We got your message ({ticket})",
    body: `Hi {name},\n\nThanks for contacting KeyStub. Your message is ticket {ticket}. We usually reply within one business day. Just reply to this email if you have anything to add.\n\nYour message:\n{message}${SIGN_OFF}`,
  },
};

export function fillTemplate(text: string, v: { name?: string | null; ticket: string; message: string }) {
  const first = v.name?.trim().split(/\s+/)[0] || "there";
  return text.replaceAll("{name}", first).replaceAll("{ticket}", v.ticket).replaceAll("{message}", v.message);
}
