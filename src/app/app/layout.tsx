import { UIProvider } from "@/components/ui";
import { UnitsProvider } from "@/components/units-provider";
import { unitPrefsOf } from "@/lib/units";
import { requireUser } from "@/server/session";

export const metadata = { robots: { index: false } };

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const user = await requireUser();
  return (
    <UnitsProvider prefs={unitPrefsOf(user)}>
      <UIProvider>{children}</UIProvider>
    </UnitsProvider>
  );
}
