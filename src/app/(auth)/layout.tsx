import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardUI, Phone } from "@/components/marketing/app-screens";
import { IconCheck } from "@/components/marketing/icons";
import { Logo } from "@/components/logo";
import { ThemeButton } from "@/components/theme-toggle";
import { APP_NAME } from "@/lib/brand";
import { getSession } from "@/server/session";
import "../(marketing)/marketing.css";

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  if (await getSession()) redirect("/app");
  return (
    <div className="mk auth-split">
      <div className="auth-form-side">
        <div className="auth-top">
          <Link href="/" className="logo-link" aria-label={`${APP_NAME} home`}>
            <Logo size={20} tone="app" />
          </Link>
          <ThemeButton />
        </div>
        <div className="auth-form-wrap">{children}</div>
        <p className="auth-legal">
          <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link> · support@keystub.com
        </p>
      </div>
      <aside className="auth-visual mk-dark" aria-hidden="true">
        <div className="auth-visual-inner">
          <div className="mk-eyebrow">Car cost tracker · Made in Canada</div>
          <h2>
            Know what your car <span style={{ color: "#f4c430" }}>really</span> costs.
          </h2>
          <ul>
            <li>
              <IconCheck size={18} /> Free for 2 vehicles
            </li>
            <li>
              <IconCheck size={18} /> 30 days of Pro on us, no card needed
            </li>
            <li>
              <IconCheck size={18} /> Export your data any time
            </li>
          </ul>
          <div className="auth-phone">
            <Phone small label="KeyStub dashboard">
              <DashboardUI className="on" />
            </Phone>
          </div>
        </div>
      </aside>
    </div>
  );
}
