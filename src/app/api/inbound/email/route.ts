import { NextResponse } from "next/server";
import { processInboundEmail, type InboundEmail } from "@/server/tickets";

/**
 * Resend inbound webhook ("email.received"): customer replies to ticket emails, and anything
 * sent to the inbox domain, become ticket messages / new tickets in KeyStub Admin.
 *
 * Setup: Resend → Webhooks → endpoint https://keystub.com/api/inbound/email, event
 * "email.received"; put its signing secret in RESEND_WEBHOOK_SECRET.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const devUnsigned = !secret && process.env.NODE_ENV === "development";
  if (!secret && !devUnsigned) return NextResponse.json({ error: "Inbound email isn't configured" }, { status: 503 });

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY || "re_dev_placeholder");
  let event: { type: string; data: { email_id: string; from: string; to: string[]; subject: string; text?: string; html?: string; attachments?: unknown[] } };
  try {
    const h = (name: string) => req.headers.get(`svix-${name}`) ?? req.headers.get(`webhook-${name}`) ?? "";
    event = secret
      ? (resend.webhooks.verify({ payload: raw, headers: { id: h("id"), timestamp: h("timestamp"), signature: h("signature") }, webhookSecret: secret }) as unknown as typeof event)
      : JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  if (event.type !== "email.received") return NextResponse.json({ ok: true, skipped: event.type });

  let email: InboundEmail;
  if (devUnsigned) {
    // Local testing only: the test payload carries the message itself.
    const d = event.data;
    email = { from: d.from, to: d.to, subject: d.subject, text: d.text ?? null, html: d.html ?? null, attachments: d.attachments?.length ?? 0 };
  } else {
    const { data, error } = await resend.emails.receiving.get(event.data.email_id);
    if (error || !data) {
      console.error("couldn't fetch inbound email", error);
      return NextResponse.json({ error: "Couldn't fetch the email" }, { status: 502 }); // Resend retries
    }
    email = { from: data.from, to: [...data.to, ...(data.received_for ?? [])], subject: data.subject ?? "", text: data.text, html: data.html, attachments: data.attachments?.length ?? 0, headers: data.headers };
  }
  const result = await processInboundEmail(email);
  return NextResponse.json({ ok: true, ...result });
}
