"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  ["", "Dashboard"],
  ["/fuel", "Fuel"],
  ["/maintenance", "Maintenance"],
  ["/costs", "Recurring & Other"],
  ["/reminders", "Reminders"],
  ["/reports", "Reports"],
  ["/vehicle", "Vehicle"],
] as const;

export function VehicleTabs({ vid }: { vid: string }) {
  const path = usePathname();
  const base = `/app/v/${vid}`;
  return (
    <nav className="tabs" aria-label="Sections">
      {TABS.map(([suffix, label]) => {
        const href = base + suffix;
        return (
          <Link key={href} href={href} aria-current={path === href ? "page" : undefined}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
