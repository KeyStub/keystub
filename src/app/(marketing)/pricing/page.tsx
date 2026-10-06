import Link from "next/link";
import { CompareTableMk, PlanCardsMk } from "@/components/marketing/plans";

export const metadata = {
  title: "Pricing",
  description: "KeyStub is free for up to 2 vehicles, with 30 days of Pro on us. Pro is $24 a year (or $3 a month) for unlimited vehicles and the time-saving extras.",
};

const FAQ = [
  ["How does the free trial work?", "Every new account gets 30 days of Pro, free. No card needed. When it ends you move to the Free plan and keep everything you've logged. Upgrade any time to keep Pro."],
  ["Is the free plan really free?", "Yes. Track up to 2 vehicles with unlimited logs, the full dashboard and reports. No card needed, and no time limit."],
  ["Can I cancel Pro any time?", "Yes. Cancel from your account in two clicks. You keep Pro until the end of the period you've paid for, then move back to Free. Your data stays."],
  ["What happens to my data if I leave?", "It's yours. Download everything as a backup file or a spreadsheet at any time, on any plan."],
  ["What does \"coming soon\" mean?", "Those features are being built now. Pro members get them automatically, at no extra cost, as soon as they're ready."],
  ["What currency are prices in?", "Canadian dollars in Canada and US dollars in the US, before applicable sales tax. The app itself works in CAD, USD, GBP, EUR, AUD or NZD, with kilometres or miles and litres or gallons."],
];

export default function PricingPage() {
  return (
    <>
      <section className="mk-page-hero">
        <div className="mk-wrap" style={{ textAlign: "center", maxWidth: 760 }}>
          <div className="mk-eyebrow">Pricing</div>
          <h1 style={{ marginTop: 14 }}>Simple, honest pricing.</h1>
          <p className="mk-sub" style={{ margin: "16px auto 0" }}>
            Start free with 30 days of Pro. Upgrade when you have more vehicles or want KeyStub to do more of the typing.
          </p>
        </div>
        <div className="mk-wrap">
          <PlanCardsMk />
        </div>
      </section>
      <section className="mk-section mk-band-white">
        <div className="mk-wrap">
          <div className="mk-eyebrow">Compare</div>
          <h2 className="mk-h2" style={{ marginBottom: 28 }}>
            Everything on each plan.
          </h2>
          <CompareTableMk />
        </div>
      </section>
      <section className="mk-section">
        <div className="mk-wrap">
          <div className="mk-eyebrow">Questions</div>
          <h2 className="mk-h2">Good to know.</h2>
          <div className="mk-faq">
            {FAQ.map(([q, a], i) => (
              <details key={q} open={i === 0}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
          <p className="mk-sub">
            Something else? Email <b>support@keystub.com</b>.
          </p>
          <div style={{ marginTop: 28 }}>
            <Link href="/sign-up" className="mk-btn yellow">
              Start free <span className="arrow">→</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
