import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { effectivePlan, trialDaysLeft } from "@/lib/plans";
import { auth } from "./auth";

/** Current session or null. Cached per request. */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

/**
 * The signed-in user, or a redirect to sign-in. Every page and server action that touches user
 * data goes through this — it is the authorization boundary, not the proxy.
 */
export async function requireUser() {
  const s = await getSession();
  if (!s) redirect("/sign-in");
  return { ...s.user, effectivePlan: effectivePlan(s.user), trialDaysLeft: s.user.plan === "pro" ? 0 : trialDaysLeft(s.user) };
}

export type CurrentUser = Awaited<ReturnType<typeof requireUser>>;
