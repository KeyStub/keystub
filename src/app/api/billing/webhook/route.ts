import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { billingEnabled, stripe, syncSubscription } from "@/server/billing";

/** Stripe → us. Signature-verified; the only place a user's plan changes. */
export async function POST(req: Request) {
  if (!billingEnabled() || !process.env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: "Billing disabled" }, { status: 404 });
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object);
      break;
    case "checkout.session.completed": {
      const cs = event.data.object;
      if (cs.subscription) {
        const sub = await stripe().subscriptions.retrieve(typeof cs.subscription === "string" ? cs.subscription : cs.subscription.id);
        await syncSubscription(sub);
      }
      break;
    }
  }
  return NextResponse.json({ received: true });
}
