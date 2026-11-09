import { notFound } from "next/navigation";
import { UIProvider } from "@/components/ui";
import { isAdminEmail } from "@/lib/admin";
import { requireUser } from "@/server/session";

export const metadata = { title: { default: "Admin", template: "%s · KeyStub Admin" }, robots: { index: false } };

/** KeyStub Admin: staff only. Everyone else gets a plain 404, so the area isn't advertised. */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireUser();
  if (!isAdminEmail(user.email)) notFound();
  return <UIProvider>{children}</UIProvider>;
}
