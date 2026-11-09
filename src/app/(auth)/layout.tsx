import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardUI, Phone } from "@/components/marketing/app-screens";
import { IconCheck } from "@/components/marketing/icons";
import { Logo } from "@/components/logo";
import { ThemeButton } from "@/components/theme-toggle";
import { APP_NAME } from "@/lib/brand";
import { getSession } from "@/server/session";
import { onAdminSite } from "@/server/site";
import "../(marketing)/marketing.css";

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const admin = await onAdminSite();
  if (await getSession()) redirect(admin ? "/" : "/app");
  if (admin)
    return (
      <div className="mk auth-split">
        <div className="auth-form-side">
          <div className="auth-top">
            <span className="logo-link" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Logo size={20} tone="app" />
              <span className="auth-admin-tag">Admin</span>
            </span>
            <ThemeButton />
          </div>
          <div className="auth-form-wrap">{children}</div>
          <p className="auth-legal">KeyStub staff only · Looking for your garage? Go to keystub.com</p>
        </div>
        <aside className="auth-visual mk-dark" aria-hidden="true">
          <div className="auth-visual-inner">
            <div className="mk-eyebrow">KeyStub Admin</div>
            <h2>
              Run <span style={{ color: "#f4c430" }}>KeyStub</span> from one place.
            </h2>
            <ul>
              <li>
                <IconCheck size={18} /> Answer support tickets and customer emails
              </li>
              <li>
                <IconCheck size={18} /> Look up customer accounts
              </li>
              <li>
                <IconCheck size={18} /> Manage auto-replies and the team
              </li>
            </ul>
            <p style={{ color: "#b9c4d8", fontSize: 14, marginTop: 24 }}>Staff accounts are protected with two-step verification.</p>
          </div>
        </aside>
      </div>
    );
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
