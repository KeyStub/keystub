import { APP_NAME } from "@/lib/brand";

export const metadata = { title: "Privacy Policy" };

// DRAFT — have this reviewed before a public launch (PIPEDA in Canada; GDPR/CCPA if you market abroad).
export default function Privacy() {
  return (
    <section className="mk-page-hero">
      <article className="mk-wrap mk-prose">
        <h1 style={{ color: "var(--mk-ink)", fontSize: "clamp(36px, 5vw, 56px)", lineHeight: 1, fontWeight: 800, marginBottom: 12 }}>Privacy Policy</h1>
        <p className="muted">Draft — last updated September 30, 2026.</p>
        <h2>What we collect</h2>
        <p>
          Your name, email address and a securely hashed password; the vehicle details and expense records you enter (which can include a VIN and licence plate);
          and basic technical data needed to keep your account secure (IP address and browser type for active sessions).
        </p>
        <h2>How we use it</h2>
        <p>
          Only to run {APP_NAME} for you: to show your records, calculate your reports, send account emails (verification, password reset, reminders you turn on)
          and process payments if you upgrade. We don&apos;t sell your data, show ads, or share it with anyone except the service providers listed below.
        </p>
        <h2>Service providers</h2>
        <p>
          Hosting and database providers store your data, on servers in the United States (Neon for the database and Vercel for the website); an email provider sends account emails; Stripe processes payments (we never see or store your card
          number). VIN lookups send only the VIN to the U.S. NHTSA public decoder.
        </p>
        <h2>Your rights</h2>
        <p>
          You can download all of your data at any time (Account → Your data) and permanently delete your account and everything in it (Account → Delete account).
          Contact us to ask any question about your information.
        </p>
        <h2>Security</h2>
        <p>
          Passwords are hashed, connections are encrypted (HTTPS), and every record is tied to your account so other users can&apos;t access it.
        </p>
      </article>
    </section>
  );
}
