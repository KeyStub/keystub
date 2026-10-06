import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { APP_NAME } from "@/lib/brand";
import { getSession } from "@/server/session";

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  if (await getSession()) redirect("/app");
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <Link href="/" className="logo-link" style={{ display: "inline-block", marginBottom: 20 }} aria-label={`${APP_NAME} home`}>
          <Logo size={22} tone="app" />
        </Link>
        <div className="card" style={{ padding: 24 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
