import { APP_NAME } from "@/lib/brand";

export const metadata = { title: "Terms of Service" };

// DRAFT — have this reviewed before a public launch.
export default function Terms() {
  return (
    <section className="mk-page-hero">
      <article className="mk-wrap mk-prose">
        <h1 style={{ color: "var(--mk-ink)", fontSize: "clamp(36px, 5vw, 56px)", lineHeight: 1, fontWeight: 800, marginBottom: 12 }}>Terms of Service</h1>
        <p className="muted">Draft — last updated September 30, 2026.</p>
        <h2>The service</h2>
        <p>
          {APP_NAME} is a tool for recording and analysing your own vehicle expenses. Reports and estimates (cost per km, fuel economy, keep-vs-replace) are based
          only on what you enter and are for information — not financial, tax or mechanical advice.
        </p>
        <h2>Your account</h2>
        <p>Keep your password private. You&apos;re responsible for activity on your account. You must be at least 16 to sign up.</p>
        <h2>Your content</h2>
        <p>You own the data you enter. We store and process it only to provide the service. You can export or delete it at any time.</p>
        <h2>Paid plans</h2>
        <p>
          Pro is billed in advance monthly or yearly through Stripe and renews automatically until cancelled. You can cancel any time from Account → Manage billing;
          you keep Pro until the end of the period you&apos;ve paid for.
        </p>
        <h2>Availability</h2>
        <p>We work to keep the service available and your data backed up, but can&apos;t guarantee uninterrupted service. Export backups of anything important.</p>
        <h2>Changes</h2>
        <p>We may update these terms; we&apos;ll notify you by email of significant changes.</p>
      </article>
    </section>
  );
}
