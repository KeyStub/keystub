import { NextResponse } from "next/server";
import { billingEnabled, ensureCustomer, stripe } from "@/server/billing";
import { getSession } from "@/server/session";

export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.redirect(new URL("/sign-in", req.url), 303);
  if (!billingEnabled()) return NextResponse.redirect(new URL("/app/account?billing=off#plan", req.url), 303);
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  const portal = await stripe().billingPortal.sessions.create({
    customer: await ensureCustomer(s.user),
    return_url: `${origin}/app/account#plan`,
  });
  return NextResponse.redirect(portal.url, 303);
}
