import { count, inArray } from "drizzle-orm";
import { AdminShell } from "@/components/admin";
import { UIProvider } from "@/components/ui";
import { db } from "@/db";
import { feedback } from "@/db/schema";
import { adminPath, can, OPEN_STATUSES, ROLES } from "@/lib/admin";
import { requireStaff } from "@/server/staff";

export const metadata = { title: { default: "Admin", template: "%s · KeyStub Admin" }, robots: { index: false } };

/** KeyStub Admin: the business back office. Staff only; everyone else gets a plain 404. */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const me = await requireStaff(undefined, { allowWithout2fa: true });
  const [{ n: open }] = await db.select({ n: count() }).from(feedback).where(inArray(feedback.status, OPEN_STATUSES));
  const raw = [
    { href: "/admin", label: "Overview" },
    ...(can(me.role, "tickets") ? [{ href: "/admin/tickets", label: "Support tickets", badge: open }] : []),
    ...(can(me.role, "customers") ? [{ href: "/admin/customers", label: "Customers" }] : []),
    ...(can(me.role, "templates") ? [{ href: "/admin/settings/auto-replies", label: "Auto-reply emails" }] : []),
    ...(can(me.role, "templates") ? [{ href: "/admin/settings/categories", label: "Ticket categories" }] : []),
    ...(can(me.role, "templates") ? [{ href: "/admin/settings/notifications", label: "Notifications" }] : []),
    ...(can(me.role, "staff") ? [{ href: "/admin/staff", label: "Staff" }] : []),
    { href: "/admin/security", label: "My security" },
    { href: "/admin/pricing", label: "Plans & pricing", soon: true },
    { href: "/admin/site", label: "Site settings", soon: true },
  ];
  const items = raw.map((i) => ({ ...i, href: adminPath(i.href) }));
  return (
    <UIProvider>
      <AdminShell items={items} name={me.user.name || me.user.email} roleLabel={ROLES.find((r) => r.id === me.role)?.label ?? me.role} dedicated={me.dedicated}>
        {!me.dedicated && (
          <div className="note" style={{ marginBottom: 16 }}>
            <b>You&apos;re using your personal account for Admin.</b> For security and to keep business separate from your garage, set up a dedicated staff
            account: see <a href={adminPath("/admin/staff")}>Staff</a>.
          </div>
        )}
        {children}
      </AdminShell>
    </UIProvider>
  );
}
