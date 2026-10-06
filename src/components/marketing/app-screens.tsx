/*
 * App "screenshots" built from real UI pieces (HTML, not images), so they stay sharp at any size and
 * match the app. Numbers are the founder's real vehicle costs (see the "*Based on real data" notes).
 */
import type { ReactNode } from "react";
import { KeyMark } from "../logo";
import { IconBell, IconChart, IconHome, IconPump } from "./icons";

export function Phone({ children, small = false, label }: { children: ReactNode; small?: boolean; label?: string }) {
  return (
    <div className={`phone${small ? " sm" : ""}`} role="img" aria-label={label ?? "KeyStub app on a phone"}>
      <div className="phone-screen">
        <div className="ui-status">
          <span>9:41</span>
          <span>●●● 5G</span>
        </div>
        {children}
      </div>
    </div>
  );
}

export function TabBar({ on }: { on: "home" | "fuel" | "reminders" | "more" | "add" }) {
  return (
    <div className="ui-tabbar" aria-hidden="true">
      <span className={on === "home" ? "on" : ""}>
        <IconHome size={18} />
        Home
      </span>
      <span className={on === "fuel" ? "on" : ""}>
        <IconPump size={18} />
        Fuel
      </span>
      <span>
        <span className="fab">+</span>
      </span>
      <span className={on === "reminders" ? "on" : ""}>
        <IconBell size={18} />
        Reminders
      </span>
      <span className={on === "more" ? "on" : ""}>
        <IconChart size={18} />
        Reports
      </span>
    </div>
  );
}

const BARS = [
  { label: "Insurance", amt: "$10,435", pct: 100, color: "#1baf7a" },
  { label: "Maintenance", amt: "$5,378", pct: 52, color: "#eb6834" },
  { label: "Fuel", amt: "$3,236", pct: 31, color: "#2a78d6" },
  { label: "Other", amt: "$221", pct: 3, color: "#e0a800" },
];

export function DashboardUI({ className = "" }: { className?: string }) {
  return (
    <div className={`ui ${className}`}>
      <div className="ui-top">
        <div>
          <div className="ui-title">Daily driver</div>
          <div className="ui-sub">2014 SUV</div>
        </div>
        <span className="ui-pill">
          <b>255,600</b> km
        </span>
      </div>
      <div className="ui-tiles">
        <div className="ui-tile navy">
          <div className="k">Total cost</div>
          <div className="v">$19,269</div>
        </div>
        <div className="ui-tile">
          <div className="k">Per month</div>
          <div className="v">$741</div>
        </div>
        <div className="ui-tile">
          <div className="k">Cost / km</div>
          <div className="v">$1.57</div>
        </div>
        <div className="ui-tile">
          <div className="k">Year to date</div>
          <div className="v">$5,499</div>
        </div>
      </div>
      <div className="ui-card">
        <h4>Where it goes</h4>
        {BARS.map((b) => (
          <div className="ui-bar" key={b.label}>
            <span>{b.label}</span>
            <span className="t">
              <i style={{ width: `${b.pct}%`, background: b.color }} />
            </span>
            <span className="a">{b.amt}</span>
          </div>
        ))}
      </div>
      <div className="ui-card">
        <h4>Coming up</h4>
        <div className="ui-row">
          <span>Registration renewal</span>
          <span className="ui-chip warn">Due soon</span>
        </div>
        <div className="ui-row">
          <span>Oil change · 264,100 km</span>
          <span className="ui-chip neutral">Upcoming</span>
        </div>
      </div>
      <TabBar on="home" />
    </div>
  );
}

export function AddVehicleUI({ className = "" }: { className?: string }) {
  return (
    <div className={`ui ${className}`}>
      <div className="ui-title">Add a vehicle</div>
      <div className="ui-field">
        <div className="l">Nickname</div>
        <div className="v">Weekend car</div>
      </div>
      <div className="ui-2">
        <div className="ui-field">
          <div className="l">Year</div>
          <div className="v">2019</div>
        </div>
        <div className="ui-field">
          <div className="l">Make</div>
          <div className="v">Mazda</div>
        </div>
      </div>
      <div className="ui-field focus">
        <div className="l">Model</div>
        <div className="v">CX-5 GT</div>
      </div>
      <div className="ui-field" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="l">VIN (optional)</div>
          <div className="v" style={{ color: "var(--ui-ink-3)", fontWeight: 500 }}>Skip, or look it up</div>
        </div>
        <span className="ui-chip neutral">Look up</span>
      </div>
      <div className="ui-2">
        <div className="ui-field">
          <div className="l">Paid</div>
          <div className="v">$24,500</div>
        </div>
        <div className="ui-field">
          <div className="l">Bought</div>
          <div className="v">Mar 2023</div>
        </div>
      </div>
      <div className="ui-btn" style={{ marginTop: 4 }}>
        Add vehicle
      </div>
    </div>
  );
}

export function FillUpUI({ className = "" }: { className?: string }) {
  return (
    <div className={`ui ${className}`}>
      <div className="ui-title">Log a fill-up</div>
      <div className="ui-sub" style={{ marginTop: -6 }}>Today · Your usual station</div>
      <div className="ui-field focus">
        <div className="l">Total paid</div>
        <div className="v" style={{ fontSize: 22, fontFamily: "var(--font-display-stack)", fontWeight: 800 }}>
          $77.81
        </div>
      </div>
      <div className="ui-2">
        <div className="ui-field">
          <div className="l">Litres</div>
          <div className="v">46.9</div>
        </div>
        <div className="ui-field">
          <div className="l">$/L</div>
          <div className="v">$1.659</div>
        </div>
      </div>
      <div className="ui-field">
        <div className="l">Odometer</div>
        <div className="v">255,600 km</div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <span className="ui-chip ok">Full tank</span>
        <span className="ui-chip neutral">Regular</span>
      </div>
      <div className="ui-btn yellow">Save fill-up</div>
      <div className="ui-toast">
        <span style={{ color: "#f4c430" }}>✓</span> Fill-up logged. Odometer updated.
      </div>
      <TabBar on="fuel" />
    </div>
  );
}

export function RemindersUI({ className = "" }: { className?: string }) {
  return (
    <div className={`ui ${className}`}>
      <div className="ui-title">Reminders</div>
      <div className="ui-card">
        <h4>Due soon</h4>
        <div className="ui-row">
          <div>
            Registration renewal
            <div className="m">Oct 20</div>
          </div>
          <span className="ui-chip warn">Due soon</span>
        </div>
      </div>
      <div className="ui-card">
        <h4>Upcoming</h4>
        <div className="ui-row">
          <div>
            Oil change + filter
            <div className="m">264,100 km or Mar 29</div>
          </div>
          <span className="ui-chip neutral">Upcoming</span>
        </div>
        <div className="ui-row">
          <div>
            Winter tires on
            <div className="m">Nov 1</div>
          </div>
          <span className="ui-chip neutral">Upcoming</span>
        </div>
      </div>
      <TabBar on="reminders" />
    </div>
  );
}

/** Small floating card used beside the hero phone. */
export function KeyBadge() {
  return (
    <span style={{ display: "grid", placeItems: "center", width: 36, height: 36, borderRadius: 10, background: "#18263f" }}>
      <KeyMark size={14} tone="brand" />
    </span>
  );
}
