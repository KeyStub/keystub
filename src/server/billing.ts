import "server-only";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@/db";
import { user } from "@/db/schema";

/**
 * Stripe billing. Entirely optional: with no STRIPE_SECRET_KEY the app runs with everyone on
 * Free (plus FOUNDER_EMAILS on Pro) and the upgrade button explains billing isn't live yet.
 *
 * Flow: Checkout (hosted by Stripe) → webhook sets user.plan. Customers manage/cancel in the
 * Stripe-hosted Billing Portal, so we never touch card details.
 */
export const billingEnabled = () => !!process.env.STRIPE_SECRET_KEY;

let _stripe: Stripe | null = null;
export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Billing isn't configured.");
  return (_stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY));
}

export async function ensureCustomer(u: { id: string; email: string; name: string }) {
  const [row] = await db.select({ cid: user.stripeCustomerId }).from(user).where(eq(user.id, u.id));
  if (row?.cid) return row.cid;
  const c = await stripe().customers.create({ email: u.email, name: u.name, metadata: { userId: u.id } });
  await db.update(user).set({ stripeCustomerId: c.id }).where(eq(user.id, u.id));
  return c.id;
}

/** Apply a subscription's state to the user it belongs to. Called from the webhook only. */
export async function syncSubscription(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const active = sub.status === "active" || sub.status === "trialing" || sub.status === "past_due";
  const periodEnd = (sub.items.data[0] as unknown as { current_period_end?: number })?.current_period_end;
  await db
    .update(user)
    .set({
      plan: active ? "pro" : "free",
      planStatus: sub.status,
      planRenewsAt: periodEnd ? new Date(periodEnd * 1000) : null,
      updatedAt: new Date(),
    })
    .where(eq(user.stripeCustomerId, customerId));
}
