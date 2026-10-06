import "server-only";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { APP_NAME } from "@/lib/brand";

/**
 * Sends transactional email through Resend when RESEND_API_KEY is set (free tier: 3,000/month).
 * Without a key — local testing, or a fresh deploy before Resend is connected — the message is
 * printed to the server log (and, locally, appended to .data/outbox.log) so verification and
 * reset links can still be clicked.
 */
export async function sendEmail(msg: { to: string; subject: string; text: string; html?: string }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? `${APP_NAME} <onboarding@resend.dev>`;

  if (!key) {
    const entry = `\n=== ${new Date().toISOString()} ===\nTo: ${msg.to}\nSubject: ${msg.subject}\n\n${msg.text}\n`;
    console.log(`[dev-mail]${entry}`);
    if (process.env.VERCEL) return; // read-only file system: the console log above is the copy
    try {
      const dir = path.join(process.cwd(), ".data");
      await mkdir(dir, { recursive: true });
      await appendFile(path.join(dir, "outbox.log"), entry);
    } catch {
      // not writable here; the console copy is enough
    }
    return;
  }

  const { Resend } = await import("resend");
  const { error } = await new Resend(key).emails.send({
    from,
    to: msg.to,
    subject: msg.subject,
    text: msg.text,
    html: msg.html,
  });
  if (error) throw new Error(`Email send failed: ${error.message}`);
}

export function linkEmail(opts: { heading: string; body: string; url: string; cta: string }) {
  const text = `${opts.heading}\n\n${opts.body}\n\n${opts.cta}: ${opts.url}\n\nIf you didn't request this, you can ignore this email.`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px;color:#16171a">
  <h2 style="margin:0 0 12px">${opts.heading}</h2>
  <p style="line-height:1.5">${opts.body}</p>
  <p style="margin:24px 0"><a href="${opts.url}" style="background:#18263F;color:#F4C430;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">${opts.cta}</a></p>
  <p style="color:#8b8e96;font-size:13px">If you didn't request this, you can ignore this email.</p></div>`;
  return { text, html };
}
