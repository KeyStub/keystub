"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usesCharging, usesFuel } from "@/lib/calc";

export function vehicleTabs(powertrain: string) {
  return [
    ["", "Dashboard"],
    ...(usesFuel(powertrain) ? [["/fuel", "Fuel"]] : []),
    ...(usesCharging(powertrain) ? [["/charging", "Charging"], ["/battery", "Battery"]] : []),
    ["/maintenance", "Maintenance"],
    ["/costs", "Recurring & Other"],
    ["/reminders", "Reminders"],
    ["/reports", "Reports"],
    ["/vehicle", "Vehicle"],
  ] as [string, string][];
}

export function VehicleTabs({ vid, powertrain }: { vid: string; powertrain: string }) {
  const path = usePathname();
  const base = `/app/v/${vid}`;
  return (
    <nav className="tabs" aria-label="Sections">
      {vehicleTabs(powertrain).map(([suffix, label]) => {
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
