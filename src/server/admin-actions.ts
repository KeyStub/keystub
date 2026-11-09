"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { emailTemplates, feedback, staff, ticketMessages } from "@/db/schema";
import { adminUrl, TEMPLATE_KEYS, ticketCode, ticketReplyTo } from "@/lib/admin";
import { APP_NAME } from "@/lib/brand";
import type { ActionResult } from "./actions";
import { sendEmail, supportFrom } from "./mailer";
import { staffForAction } from "./staff";

const DENIED: ActionResult = { ok: false, error: "You don't have access to do that." };
const fail = (e: unknown): ActionResult =>
  e instanceof z.ZodError ? { ok: false, error: e.issues[0]?.message ?? "Check the form." } : { ok: false, error: e instanceof Error ? e.message : "Something went wrong" };
const staffName = (u: { name?: string | null; email: string }) => u.name?.trim() || u.email;

const ticketPath = (n: number) => `/admin/tickets/${n}`;

/* ---------------- tickets ---------------- */

const statusSchema = z.enum(["new", "in_progress", "planned", "done", "closed"]);

export async function setTicketStatus(ticketId: string, status: unknown): Promise<ActionResult> {
  try {
    const me = await staffForAction("tickets");
    if (!me) return DENIED;
    const s = statusSchema.parse(status);
    const [t] = await db.update(feedback).set({ status: s, updatedAt: new Date() }).where(eq(feedback.id, ticketId)).returning({ number: feedback.number });
    if (!t) return { ok: false, error: "Ticket not found" };
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

const bodySchema = z.string().trim().min(1, "Write something first.").max(10000, "That's too long.");

/** Internal note: saved as its own entry; only staff see it. */
export async function addTicketNote(ticketId: string, body: unknown): Promise<ActionResult> {
  try {
    const me = await staffForAction("tickets");
    if (!me) return DENIED;
    const text = bodySchema.parse(body);
    const [t] = await db.select({ number: feedback.number }).from(feedback).where(eq(feedback.id, ticketId));
    if (!t) return { ok: false, error: "Ticket not found" };
    await db.insert(ticketMessages).values({ ticketId, kind: "note", body: text, authorId: me.user.id, authorName: staffName(me.user) });
    revalidatePath(ticketPath(t.number));
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Email a reply to the customer from support@, and keep it on the ticket. */
export async function replyToTicket(ticketId: string, input: unknown): Promise<ActionResult> {
  try {
    const me = await staffForAction("tickets");
    if (!me) return DENIED;
    const d = z.object({ body: bodySchema, status: statusSchema.optional() }).parse(input);
    const [t] = await db.select().from(feedback).where(eq(feedback.id, ticketId));
    if (!t) return { ok: false, error: "Ticket not found" };
    const code = ticketCode(t.number);
    const quoted = t.message
      .split("\n")
      .map((l) => `> ${l}`)
      .join("\n");
    const firstLine = t.message.split("\n")[0].slice(0, 60);
    let emailStatus = "sent";
    try {
      await sendEmail({
        to: t.email,
        from: supportFrom(),
        replyTo: ticketReplyTo(t.number),
        subject: `Re: [${code}] ${firstLine}`,
        text: `${d.body}\n\n—\n${staffName(me.user)}, ${APP_NAME} support\nTicket ${code}. Just reply to this email to continue the conversation.\n\nYou wrote:\n${quoted}`,
      });
    } catch (e) {
      emailStatus = "failed";
      console.error("ticket reply failed", e);
    }
    await db.insert(ticketMessages).values({ ticketId, kind: "reply", body: d.body, authorId: me.user.id, authorName: staffName(me.user), emailStatus });
    await db
      .update(feedback)
      .set({ status: d.status ?? (t.status === "new" ? "in_progress" : t.status), updatedAt: new Date() })
      .where(eq(feedback.id, ticketId));
    revalidatePath("/admin", "layout");
    if (emailStatus === "failed") return { ok: false, error: "Saved on the ticket, but the email couldn't be sent. Check the email settings, then try again." };
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ---------------- auto-reply templates ---------------- */

const templateSchema = z.object({
  key: z.enum(TEMPLATE_KEYS.map((k) => k.key) as [string, ...string[]]),
  subject: z.string().trim().min(1, "Add a subject").max(200),
  body: z.string().trim().min(1, "Add a message").max(10000),
  enabled: z.boolean(),
});

export async function saveTemplate(input: unknown): Promise<ActionResult> {
  try {
    const me = await staffForAction("templates");
    if (!me) return DENIED;
    const d = templateSchema.parse(input);
    await db
      .insert(emailTemplates)
      .values({ ...d, updatedBy: staffName(me.user), updatedAt: new Date() })
      .onConflictDoUpdate({ target: emailTemplates.key, set: { subject: d.subject, body: d.body, enabled: d.enabled, updatedBy: staffName(me.user), updatedAt: new Date() } });
    revalidatePath("/admin/settings/auto-replies");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Back to the built-in wording. */
export async function resetTemplate(key: string): Promise<ActionResult> {
  try {
    const me = await staffForAction("templates");
    if (!me) return DENIED;
    await db.delete(emailTemplates).where(eq(emailTemplates.key, key));
    revalidatePath("/admin/settings/auto-replies");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ---------------- staff ---------------- */

const roleSchema = z.enum(["owner", "admin", "support"]);

export async function addStaff(input: unknown): Promise<ActionResult> {
  try {
    const me = await staffForAction("staff");
    if (!me) return DENIED;
    const d = z
      .object({
        email: z.string().trim().toLowerCase().email("Enter a valid email address"),
        name: z.string().trim().max(120).optional(),
        role: roleSchema,
        perkEmail: z.union([z.literal(""), z.string().trim().toLowerCase().email("Enter a valid personal email, or leave it blank")]).optional(),
      })
      .parse(input);
    if (d.perkEmail && d.perkEmail === d.email) return { ok: false, error: "The personal account email should be different from their work email." };
    const [exists] = await db.select({ id: staff.id }).from(staff).where(sql`lower(${staff.email}) = ${d.email}`);
    if (exists) return { ok: false, error: "That person is already on the staff list." };
    await db.insert(staff).values({ email: d.email, name: d.name || null, role: d.role, perkEmail: d.perkEmail || null, addedBy: staffName(me.user) });
    try {
      await sendEmail({
        to: d.email,
        from: supportFrom(),
        subject: `You've been added to the ${APP_NAME} team`,
        text: `Hi${d.name ? ` ${d.name.split(" ")[0]}` : ""},\n\n${staffName(me.user)} gave you ${d.role} access to ${APP_NAME} Admin.\n\n1. Create your staff account with this email address: ${adminUrl("/sign-up")}\n   (Already have one? Sign in: ${adminUrl("/sign-in")})\n2. Turn on two-step verification when asked. It's required for staff.\n3. You'll land in ${APP_NAME} Admin: ${adminUrl("/admin")}\n\nThis is a work account: it opens straight into Admin and doesn't have a personal garage.${d.perkEmail ? `\n\nTeam perk: your personal KeyStub account (${d.perkEmail}) gets Pro free while you're on the team.` : ""}`,
      });
    } catch (e) {
      console.error("staff invite email failed", e);
    }
    revalidatePath("/admin/staff");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setStaffRole(id: string, role: unknown): Promise<ActionResult> {
  try {
    const me = await staffForAction("staff");
    if (!me) return DENIED;
    const r = roleSchema.parse(role);
    const [row] = await db.select().from(staff).where(eq(staff.id, id));
    if (!row) return { ok: false, error: "Not found" };
    if (row.email.toLowerCase() === me.user.email.toLowerCase()) return { ok: false, error: "You can't change your own role." };
    await db.update(staff).set({ role: r }).where(eq(staff.id, id));
    revalidatePath("/admin/staff");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function removeStaff(id: string): Promise<ActionResult> {
  try {
    const me = await staffForAction("staff");
    if (!me) return DENIED;
    const [row] = await db.select().from(staff).where(eq(staff.id, id));
    if (!row) return { ok: false, error: "Not found" };
    if (row.email.toLowerCase() === me.user.email.toLowerCase()) return { ok: false, error: "You can't remove yourself." };
    await db.delete(staff).where(and(eq(staff.id, id)));
    revalidatePath("/admin/staff");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Personal account that gets free Pro while this person is on the team ("" removes it). */
export async function setStaffPerk(id: string, perkEmail: unknown): Promise<ActionResult> {
  try {
    const me = await staffForAction("staff");
    if (!me) return DENIED;
    const e = z.union([z.literal(""), z.string().trim().toLowerCase().email("Enter a valid email, or leave it blank")]).parse(perkEmail ?? "");
    const [row] = await db.select().from(staff).where(eq(staff.id, id));
    if (!row) return { ok: false, error: "Not found" };
    if (e && e === row.email.toLowerCase()) return { ok: false, error: "Use their personal email, not the work one." };
    await db.update(staff).set({ perkEmail: e || null }).where(eq(staff.id, id));
    revalidatePath("/admin/staff");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
