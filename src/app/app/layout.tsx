import { UIProvider } from "@/components/ui";
import { requireUser } from "@/server/session";

export const metadata = { robots: { index: false } };

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  await requireUser();
  return <UIProvider>{children}</UIProvider>;
}
