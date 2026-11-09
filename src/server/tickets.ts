import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { emailTemplates, ticketMessages } from "@/db/schema";
import { DEFAULT_TEMPLATES, fillTemplate, SUPPORT_EMAIL, TEMPLATE_KEYS, TICKET_KIND_LABEL, ticketCode, type TemplateKey } from "@/lib/admin";
import { sendEmail, supportFrom } from "./mailer";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

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
};

/** After a ticket is saved: auto-reply to the customer and notify the support inbox. Never throws. */
export async function afterTicketCreated(t: NewTicket) {
  const code = ticketCode(t.number);
  const key = TEMPLATE_KEYS.find((k) => k.kind === t.kind)?.key;
  if (key) {
    const tpl = await getTemplate(key);
    if (tpl.enabled) {
      const vars = { name: t.name, ticket: code, message: t.message };
      const subject = fillTemplate(tpl.subject, vars);
      const body = fillTemplate(tpl.body, vars);
      let status = "sent";
      try {
        await sendEmail({ to: t.email, from: supportFrom(), replyTo: SUPPORT_EMAIL(), subject, text: body });
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
        `Open it in KeyStub Admin: ${appUrl()}/admin/tickets/${t.number}`,
      ]
        .filter((l) => l != null)
        .join("\n"),
    });
  } catch (e) {
    console.error("support notification failed", e);
  }
}
