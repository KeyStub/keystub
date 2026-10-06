"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "../logo";
import { ThemeButton } from "../theme-toggle";
import { IconClose, IconMenu } from "./icons";

const LINKS = [
  { href: "/#how", label: "How it works", section: "how" },
  { href: "/#features", label: "Features", section: "features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/coming-soon", label: "Coming soon" },
];

export function MarketingNav() {
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Underline the section currently in view (homepage only).
  useEffect(() => {
    if (path !== "/") return;
    const els = LINKS.map((l) => (l.section ? document.getElementById(l.section) : null)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-45% 0px -50% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [path]);

  const isActive = (l: (typeof LINKS)[number]) => (l.section ? path === "/" && active === l.section : path === l.href);

  return (
    <header className={`mk-nav${scrolled || open ? " scrolled" : ""}`}>
      <div className="mk-wrap mk-nav-inner">
        <Link href="/" className="logo-link" aria-label="KeyStub home" onClick={() => setOpen(false)}>
          <Logo size={20} tone="app" />
        </Link>
        <nav className="mk-links" aria-label="Main">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={`lnk${isActive(l) ? " active" : ""}`}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="mk-actions">
          <ThemeButton />
          <Link href="/sign-in" className="mk-btn ghost sm signin">
            Sign in
          </Link>
          <Link href="/sign-up" className="mk-btn yellow sm">
            Start free
          </Link>
          <button type="button" className="mk-menu-btn" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? <IconClose /> : <IconMenu />}
          </button>
        </div>
      </div>
      <div className={`mk-mobile-menu${open ? " open" : ""}`}>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>
            {l.label}
          </Link>
        ))}
        <Link href="/sign-in" onClick={() => setOpen(false)}>
          Sign in
        </Link>
      </div>
    </header>
  );
}
