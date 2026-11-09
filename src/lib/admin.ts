/** Who can open KeyStub Admin (/admin). Comma-separated ADMIN_EMAILS; falls back to FOUNDER_EMAILS. */
export function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS || process.env.FOUNDER_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export const SUPPORT_EMAIL = () => process.env.SUPPORT_EMAIL || "support@keystub.com";

export const FEEDBACK_KINDS = [
  { id: "bug", label: "Bug", emoji: "🐞", hint: "Something isn't working right" },
  { id: "idea", label: "Idea", emoji: "💡", hint: "A feature or improvement you'd like" },
  { id: "question", label: "Question", emoji: "❓", hint: "Not sure how something works" },
  { id: "other", label: "Other", emoji: "💬", hint: "Anything else on your mind" },
] as const;

export const CONTACT_TOPICS = [
  { id: "support", label: "Help with my account" },
  { id: "billing", label: "Billing or plans" },
  { id: "partnership", label: "Partnership or creator collaboration" },
  { id: "press", label: "Press" },
  { id: "other", label: "Something else" },
] as const;

export const FEEDBACK_STATUSES = [
  { id: "new", label: "New" },
  { id: "planned", label: "Planned" },
  { id: "in_progress", label: "In progress" },
  { id: "done", label: "Done" },
  { id: "closed", label: "Closed" },
] as const;
