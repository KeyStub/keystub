import { redirect } from "next/navigation";
import { UIProvider } from "@/components/ui";
import { UnitsProvider } from "@/components/units-provider";
import { unitPrefsOf } from "@/lib/units";
import { requireUser } from "@/server/session";
import { staffInfoFor } from "@/server/staff";
import { adminUrl } from "@/lib/admin";

export const metadata = { robots: { index: false } };

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const user = await requireUser();
  // Staff work accounts have no garage: they open straight into KeyStub Admin.
  if ((await staffInfoFor(user.email))?.dedicated) redirect(adminUrl("/admin"));
  return (
    <UnitsProvider prefs={unitPrefsOf(user)}>
      <UIProvider>{children}</UIProvider>
    </UnitsProvider>
  );
}
