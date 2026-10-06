import Link from "next/link";
import { TAGLINE } from "@/lib/brand";
import { Logo } from "../logo";

export function MarketingFooter() {
  return (
    <footer className="mk-footer">
      <div className="mk-wrap">
        <div className="mk-footer-grid">
          <div>
            <Logo size={20} tone="app" />
            <p style={{ marginTop: 14, maxWidth: 300, lineHeight: 1.6 }}>{TAGLINE} Track fuel, maintenance, insurance and everything else your car costs.</p>
          </div>
          <div>
            <h4>Product</h4>
            <Link href="/#how">How it works</Link>
            <Link href="/#features">Features</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/coming-soon">Coming soon</Link>
          </div>
          <div>
            <h4>Account</h4>
            <Link href="/sign-up">Start free</Link>
            <Link href="/sign-in">Sign in</Link>
          </div>
          <div>
            <h4>Company</h4>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <span style={{ display: "block", padding: "4px 0" }}>support@keystub.com</span>
          </div>
        </div>
        <div className="base">
          <span>© {new Date().getFullYear()} KeyStub · Made in Canada</span>
          <span>Kilometres, litres and dollars.</span>
        </div>
      </div>
    </footer>
  );
}
