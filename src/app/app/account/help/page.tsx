import Link from "next/link";

export const metadata = { title: "Help & feedback" };

export default function HelpPage() {
  const rows = [
    ["Getting started tour", "A one-minute walk through how KeyStub works and what each menu is for.", "/app/welcome?replay=1", "Replay the tour"],
    ["Send feedback", "Report a bug, suggest a feature, or ask a question. You'll get a ticket number and can follow its status.", "/app/feedback", "Send feedback"],
    ["Contact support", "Help with your account or billing. We usually reply within one business day.", "/contact", "Contact us"],
  ] as const;
  return (
    <>
      <h2 className="acc-h2">Help &amp; feedback</h2>
      <div className="card" style={{ padding: 0 }}>
        <div className="list">
          {rows.map(([t, d, href, cta]) => (
            <div className="list-item" key={t} style={{ padding: "14px 16px" }}>
              <div className="l-main">
                <div className="l-title">{t}</div>
                <div className="l-sub" style={{ whiteSpace: "normal" }}>{d}</div>
              </div>
              <Link href={href} className="btn sm">
                {cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
      <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
        Or email <a href="mailto:support@keystub.com">support@keystub.com</a>.
      </p>
    </>
  );
}
