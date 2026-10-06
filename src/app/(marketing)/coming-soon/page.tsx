import Link from "next/link";
import { IconBell, IconCamera, IconChart, IconDownload, IconHome, IconPump } from "@/components/marketing/icons";

export const metadata = {
  title: "Coming soon",
  description: "What we're building next for KeyStub: receipt scanning, scheduled payments, smart reminders, custom categories and phone apps.",
};

const COMING = [
  {
    t: "Snap the receipt",
    d: "Take a photo of your gas or shop receipt and KeyStub fills in the station, total, litres, price per litre and grade for you. You check it and save.",
    pro: true,
    Icon: IconCamera,
  },
  {
    t: "Scheduled payments",
    d: "Set up costs that repeat, like insurance on the 15th of every month, and they're logged on schedule. If the amount changes, KeyStub asks you to confirm it.",
    Icon: IconChart,
  },
  {
    t: "Smart reminders",
    d: "KeyStub learns your habits. If a payment hasn't shown up a couple of days after it usually does, or you haven't logged gas in longer than normal, you get a nudge in the app. Pro adds email and phone reminders.",
    pro: true,
    Icon: IconBell,
  },
  {
    t: "Your own categories",
    d: "Car washes, detailing, accessories, anything that fits how you drive. Free includes up to 3 custom categories; Pro is unlimited.",
    Icon: IconPump,
  },
  {
    t: "Bank-statement import",
    d: "Upload a statement and KeyStub suggests the fuel, insurance and repair entries it finds, skipping things that aren't car costs. You approve each one.",
    pro: true,
    Icon: IconDownload,
  },
  {
    t: "Phone apps",
    d: "KeyStub for iPhone and Android in the App Store and Google Play. Until then, add the website to your home screen and it works like an app.",
    Icon: IconHome,
  },
];

export default function ComingSoonPage() {
  return (
    <>
      <section className="mk-page-hero">
        <div className="mk-wrap" style={{ maxWidth: 820 }}>
          <div className="mk-eyebrow">Coming soon</div>
          <h1 style={{ marginTop: 14 }}>What we&apos;re building next.</h1>
          <p className="mk-sub">Less typing and fewer forgotten receipts. Pro members get each feature as soon as it&apos;s ready, at no extra cost.</p>
        </div>
        <div className="mk-wrap">
          <div className="mk-cards3">
            {COMING.map(({ t, d, pro, Icon }) => (
              <article className="mk-card rv" key={t}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ width: 44, height: 44, borderRadius: 14, background: "#18263f", color: "#f4c430", display: "grid", placeItems: "center" }}>
                    <Icon />
                  </span>
                  <span style={{ display: "flex", gap: 6 }}>
                    <span className="mk-soon">Coming soon</span>
                    {pro && <span className="mk-pro">Pro</span>}
                  </span>
                </div>
                <h3>{t}</h3>
                <p>{d}</p>
              </article>
            ))}
          </div>
          <p className="mk-sub" style={{ marginTop: 32 }}>
            Have an idea? Email <b>support@keystub.com</b>. Early users shape what gets built first.
          </p>
          <div style={{ marginTop: 24, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/sign-up" className="mk-btn yellow">
              Start free <span className="arrow">→</span>
            </Link>
            <Link href="/pricing" className="mk-btn ghost">
              See pricing
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
