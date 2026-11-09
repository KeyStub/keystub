import "server-only";
import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { effectivePlan, trialDaysLeft } from "@/lib/plans";
import { unitPrefsOf } from "@/lib/units";
import { auth } from "./auth";

/** Current session or null. Cached per request. */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

/** Team perk: a staff member's personal account gets Pro while they're on the staff list. */
export const hasStaffPerk = cache(async (email: string) => {
  const [row] = await db
    .select({ id: staff.id })
    .from(staff)
    .where(sql`lower(${staff.perkEmail}) = ${email.toLowerCase()}`)
    .limit(1);
  return !!row;
});

/**
 * The signed-in user, or a redirect to sign-in. Every page and server action that touches user
 * data goes through this — it is the authorization boundary, not the proxy.
 */
export async function requireUser() {
  const s = await getSession();
  if (!s) redirect("/sign-in");
  const perk = await hasStaffPerk(s.user.email);
  const plan = perk ? "pro" : effectivePlan(s.user);
  return {
    ...s.user,
    effectivePlan: plan,
    /** "staff" when Pro comes from the team perk */
    planSource: perk ? ("staff" as const) : s.user.plan === "pro" ? ("paid" as const) : plan === "pro" && trialDaysLeft(s.user) > 0 ? ("trial" as const) : plan === "pro" ? ("founder" as const) : ("free" as const),
    trialDaysLeft: s.user.plan === "pro" || perk ? 0 : trialDaysLeft(s.user),
    units: unitPrefsOf(s.user),
  };
}

export type CurrentUser = Awaited<ReturnType<typeof requireUser>>;
