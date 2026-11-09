import "server-only";
import { sql } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { adminPath, can, type Permission, type StaffRole } from "@/lib/admin";
import { getSession } from "./session";

const envList = (v: string | undefined) =>
  (v ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export type StaffInfo = {
  role: StaffRole;
  /**
   * true for a dedicated staff account (in ADMIN_EMAILS or the staff list): it has no garage and
   * opens straight into Admin. false for the temporary founder fallback (a personal account with
   * admin access because ADMIN_EMAILS isn't set yet).
   */
  dedicated: boolean;
};

/** The signed-in person's staff role, or null for customers. */
export const staffInfoFor = cache(async (email: string | null | undefined): Promise<StaffInfo | null> => {
  if (!email) return null;
  const e = email.toLowerCase();
  if (envList(process.env.ADMIN_EMAILS).includes(e)) return { role: "owner", dedicated: true };
  const [row] = await db
    .select({ role: staff.role })
    .from(staff)
    .where(sql`lower(${staff.email}) = ${e}`);
  if (row) return { role: row.role as StaffRole, dedicated: true };
  // Until ADMIN_EMAILS is set, the founder's personal account keeps owner access.
  if (!process.env.ADMIN_EMAILS && envList(process.env.FOUNDER_EMAILS).includes(e)) return { role: "owner", dedicated: false };
  return null;
});

/**
 * Guard for admin pages and actions. Customers get a plain 404 (the area isn't advertised).
 * Dedicated staff accounts must have two-step verification on.
 */
export async function requireStaff(perm?: Permission, opts: { allowWithout2fa?: boolean } = {}) {
  const s = await getSession();
  if (!s) redirect(`/sign-in?next=${encodeURIComponent(adminPath("/admin"))}`);
  const info = await staffInfoFor(s.user.email);
  if (!info) notFound();
  const twoFactor = !!(s.user as { twoFactorEnabled?: boolean | null }).twoFactorEnabled;
  if (info.dedicated && !twoFactor && !opts.allowWithout2fa) redirect(adminPath("/admin/security?setup=1"));
  if (perm && !can(info.role, perm)) notFound();
  return { user: s.user, ...info, twoFactor };
}

/** Same check for server actions: returns null instead of redirecting. */
export async function staffForAction(perm: Permission) {
  const s = await getSession();
  if (!s) return null;
  const info = await staffInfoFor(s.user.email);
  if (!info || !can(info.role, perm)) return null;
  const twoFactor = !!(s.user as { twoFactorEnabled?: boolean | null }).twoFactorEnabled;
  if (info.dedicated && !twoFactor) return null;
  return { user: s.user, ...info };
}
