import { APP_NAME } from "@/lib/brand";

/* The KeyStub mark: a car key whose head is a ticket stub. Same geometry as brand/ (scripts in the brand kit). */
const TICKET =
  "M15 31H35.5A4.5 4.5 0 0 0 44.5 31H47A5 5 0 0 1 52 36V64A5 5 0 0 1 47 69H44.5A4.5 4.5 0 0 0 35.5 69H15A5 5 0 0 1 10 64V36A5 5 0 0 1 15 31Z" +
  "M15.5 50a5.5 5.5 0 1 0 11 0a5.5 5.5 0 1 0 -11 0Z" +
  [37, 42.5, 48, 53.5, 59].map((y) => `M38.9 ${y}h2.2v3.5h-2.2Z`).join("");
const BLADE = "M52 45H83L89 50L83 55H79V59.5H75V55H70V60.5H66V55H52Z";

/**
 * tone="brand": yellow ticket + light blade (for navy backgrounds).
 * tone="ink": single colour that follows the text colour.
 * tone="app": yellow ticket + blade in the text colour (works on light and dark pages).
 */
export function KeyMark({ size = 28, tone = "ink" }: { size?: number; tone?: "brand" | "ink" | "app" }) {
  const ticket = tone === "ink" ? "currentColor" : "#F4C430";
  const blade = tone === "brand" ? "#F2F4F7" : "currentColor";
  return (
    <svg width={(size * 87) / 46} height={size} viewBox="6 27 87 46" aria-hidden="true" focusable="false">
      <path fill={ticket} fillRule="evenodd" d={TICKET} />
      <path fill={blade} d={BLADE} />
    </svg>
  );
}

export function Logo({ size = 22, tone = "ink" }: { size?: number; tone?: "brand" | "ink" | "app" }) {
  return (
    <span className="logo" style={{ fontSize: size }}>
      <KeyMark size={size * 1.15} tone={tone} />
      <span className="logo-word">{APP_NAME}</span>
    </span>
  );
}
