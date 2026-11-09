"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const ACCOUNT_SECTIONS = [
  { href: "/app/account", label: "Profile" },
  { href: "/app/account/plan", label: "Plan & billing" },
  { href: "/app/account/preferences", label: "Preferences" },
  { href: "/app/account/home-screen", label: "Home screen" },
  { href: "/app/account/stations", label: "Saved stations" },
  { href: "/app/account/security", label: "Security" },
  { href: "/app/account/data", label: "Your data" },
  { href: "/app/account/help", label: "Help & feedback" },
];

/** Account sub-menu: a sidebar on computers, a scrollable row of tabs on phones. */
export function AccountNav() {
  const path = usePathname();
  return (
    <nav className="acc-nav" aria-label="Account sections">
      {ACCOUNT_SECTIONS.map((s) => (
        <Link key={s.href} href={s.href} className={path === s.href ? "on" : ""} aria-current={path === s.href ? "page" : undefined}>
          {s.label}
        </Link>
      ))}
    </nav>
  );
}
