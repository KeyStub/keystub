"use client";

import { useEffect, useRef, useState } from "react";
import { AddVehicleUI, DashboardUI, FillUpUI, Phone } from "./app-screens";

const STEPS = [
  {
    title: "Add your vehicle",
    body: "Type in the year, make and model yourself, or enter the VIN to fill them in. The VIN is optional and always private. Moving from a spreadsheet or another tracker? Import it.",
    Screen: AddVehicleUI,
  },
  {
    title: "Log costs as they happen",
    body: "Fill-ups, oil changes, repairs, insurance, registration, parking: each takes seconds. KeyStub catches duplicates and odometer typos before they mess up your numbers.",
    Screen: FillUpUI,
  },
  {
    title: "See what it really costs",
    body: "Your dashboard turns every receipt into the numbers that matter: total cost, cost per kilometre, cost per month, and what's due next.",
    Screen: DashboardUI,
  },
];

/** Desktop: steps scroll past a sticky phone whose screen follows along. Mobile: each step shows its own phone. */
export function HowItWorks() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
        }),
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="how-grid">
      <div className="how-steps">
        {STEPS.map((s, i) => (
          <div
            key={s.title}
            data-i={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className={`how-step${active === i ? " active" : ""}`}
          >
            <span className="n">{i + 1}</span>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
            <div className="inline-phone">
              <Phone small label={`App screen: ${s.title}`}>
                <s.Screen />
              </Phone>
            </div>
          </div>
        ))}
      </div>
      <div className="how-sticky" aria-hidden="true">
        <Phone>
          {STEPS.map((s, i) => (
            <s.Screen key={s.title} className={active === i ? "on" : ""} />
          ))}
        </Phone>
      </div>
    </div>
  );
}
