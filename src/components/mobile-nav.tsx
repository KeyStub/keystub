"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { IconBell, IconChart, IconHome, IconMore, IconPump, IconWrench } from "./marketing/icons";
import { SignOutButton } from "./sign-out-button";
import { ThemeSegmented } from "./theme-toggle";

/**
 * Phone layout: a bottom tab bar with a yellow "+" in the middle for quick logging, like a native
 * app. Hidden on wider screens, where the top tabs are used instead.
 */
export function MobileNav({ vid }: { vid: string }) {
  const path = usePathname();
  const base = `/app/v/${vid}`;
  // The sheet remembers which page it was opened on, so navigating away closes it.
  const [open, setOpen] = useState<null | { kind: "add" | "more"; path: string }>(null);
  const sheet = open && open.path === path ? open.kind : null;
  const setSheet = (kind: "add" | "more" | null) => setOpen(kind ? { kind, path } : null);

  const tab = (href: string, label: string, Icon: typeof IconHome) => (
    <Link href={href} className={`mnav-item${path === href ? " on" : ""}`} aria-current={path === href ? "page" : undefined}>
      <Icon size={22} />
      <span>{label}</span>
    </Link>
  );

  return (
    <>
      {sheet && <button type="button" className="mnav-scrim" aria-label="Close" onClick={() => setSheet(null)} />}
      {sheet === "add" && (
        <div className="mnav-sheet" role="dialog" aria-label="Log something">
          <b>Log something</b>
          <Link href={`${base}/fuel?add=1`} className="sheet-row">
            <span className="ic">
              <IconPump />
            </span>
            Fill-up
          </Link>
          <Link href={`${base}/maintenance?add=1`} className="sheet-row">
            <span className="ic">
              <IconWrench />
            </span>
            Maintenance or repair
          </Link>
          <Link href={`${base}/costs?add=1`} className="sheet-row">
            <span className="ic">
              <IconChart />
            </span>
            Insurance, registration or other
          </Link>
          <Link href={`${base}/reminders?add=1`} className="sheet-row">
            <span className="ic">
              <IconBell />
            </span>
            Reminder
          </Link>
        </div>
      )}
      {sheet === "more" && (
        <div className="mnav-sheet" role="dialog" aria-label="More">
          <b>More</b>
          <Link href={`${base}/maintenance`} className="sheet-row">Maintenance</Link>
          <Link href={`${base}/costs`} className="sheet-row">Recurring &amp; other costs</Link>
          <Link href={`${base}/reports`} className="sheet-row">Reports</Link>
          <Link href={`${base}/vehicle`} className="sheet-row">Vehicle profile</Link>
          <Link href="/app?garage=1" className="sheet-row">Garage (all vehicles)</Link>
          <Link href="/app/account" className="sheet-row">Account</Link>
          <div className="sheet-row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
            Theme <ThemeSegmented />
          </div>
          <div className="sheet-row" style={{ padding: 0 }}>
            <SignOutButton />
          </div>
        </div>
      )}
      <nav className="mnav" aria-label="Sections">
        {tab(base, "Home", IconHome)}
        {tab(`${base}/fuel`, "Fuel", IconPump)}
        <button type="button" className="mnav-fab" aria-label="Log something" onClick={() => setSheet(sheet === "add" ? null : "add")}>
          +
        </button>
        {tab(`${base}/reminders`, "Reminders", IconBell)}
        <button type="button" className={`mnav-item${sheet === "more" ? " on" : ""}`} onClick={() => setSheet(sheet === "more" ? null : "more")}>
          <IconMore size={22} />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
