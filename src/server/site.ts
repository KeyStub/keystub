import "server-only";
import { headers } from "next/headers";
import { ADMIN_HOST } from "@/lib/admin";

/** True when this request is for the admin site (admin.keystub.com). */
export async function onAdminSite() {
  if (!ADMIN_HOST) return false;
  const h = await headers();
  return (h.get("x-forwarded-host") ?? h.get("host") ?? "").toLowerCase() === ADMIN_HOST;
}
