import { ContactForm } from "@/components/feedback";

export const metadata = {
  title: "Contact",
  description: "Questions, account help, partnerships or press: get in touch with the KeyStub team.",
};

export default function ContactPage() {
  return (
    <section className="mk-page-hero">
      <div className="mk-wrap mk-contact">
        <div>
          <div className="mk-eyebrow">Contact</div>
          <h1 className="mk-h2" style={{ fontSize: "clamp(34px, 5vw, 52px)" }}>
            We&apos;d love to hear from you.
          </h1>
          <p className="mk-sub">
            Questions about your account, billing, a partnership, or just want to say hi? Send us a message and a real person will reply, usually within one
            business day.
          </p>
          <div className="mk-contact-side">
            <div>
              <b>Email</b>
              <a href="mailto:support@keystub.com">support@keystub.com</a>
            </div>
            <div>
              <b>Using KeyStub?</b>
              <span>Report bugs and suggest features right in the app: More → Send feedback.</span>
            </div>
            <div>
              <b>Based in</b>
              <span>Alberta, Canada</span>
            </div>
          </div>
        </div>
        <ContactForm />
      </div>
    </section>
  );
}
