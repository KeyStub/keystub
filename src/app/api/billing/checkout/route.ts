import { NextResponse } from "next/server";
import { billingEnabled, ensureCustomer, stripe } from "@/server/billing";
import { getSession } from "@/server/session";

export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.redirect(new URL("/sign-in", req.url), 303);
  if (!billingEnabled()) return NextResponse.redirect(new URL("/app/account?billing=off#plan", req.url), 303);
  const interval = (await req.formData()).get("interval") === "year" ? "year" : "month";
  const price = interval === "year" ? process.env.STRIPE_PRICE_PRO_YEARLY : process.env.STRIPE_PRICE_PRO_MONTHLY;
  if (!price) return NextResponse.redirect(new URL("/app/account?billing=off#plan", req.url), 303);
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: await ensureCustomer(s.user),
    line_items: [{ price, quantity: 1 }],
    allow_promotion_codes: true,
    automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === "1" },
    success_url: `${origin}/app/account?upgraded=1#plan`,
    cancel_url: `${origin}/app/account#plan`,
    client_reference_id: s.user.id,
  });
  return NextResponse.redirect(session.url!, 303);
}
