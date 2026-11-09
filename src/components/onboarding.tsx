"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { UNIT_PRESETS, type UnitPrefs } from "@/lib/units";
import { completeOnboarding, saveUnitPrefs } from "@/server/actions";
import { Logo } from "./logo";
import { AddVehicleUI, DashboardUI, FillUpUI, Phone, RemindersUI } from "./marketing/app-screens";
import {
  IconBattery,
  IconBell,
  IconChart,
  IconDownload,
  IconGauge,
  IconHome,
  IconMore,
  IconPlug,
  IconPump,
  IconScale,
  IconShield,
  IconWrench,
} from "./marketing/icons";
import { useToast } from "./ui";

type Props = {
  firstName: string | null;
  hasVehicles: boolean;
  /** true when replaying from Account (or already completed once) */
  replay: boolean;
  units: UnitPrefs;
  trialDaysLeft: number;
  isPro: boolean;
};

type Step = { key: string; eyebrow: string; title: string; body: ReactNode; visual: ReactNode };

/** One row of "icon + name + what it's for", used on the menus and settings steps. */
function Row({ icon, name, children }: { icon: ReactNode; name: string; children: ReactNode }) {
  return (
    <li className="ob-row">
      <span className="ob-row-ic">{icon}</span>
      <span>
        <b>{name}</b>
        <span className="ob-row-d">{children}</span>
      </span>
    </li>
  );
}

function PhoneVisual({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="mk ob-visual">
      <div className="ob-phone">
        <Phone small label={label}>
          {children}
        </Phone>
      </div>
    </div>
  );
}

function MenusStep({ perDist }: { perDist: string }) {
  // null = follow the screen size (CSS shows the matching list); a tap pins one.
  const [view, setView] = useState<null | "phone" | "computer">(null);
  return (
    <div className={`ob-menus${view ? " pinned-" + view : " auto"}`}>
      <div className="seg ob-seg" role="tablist" aria-label="Which layout">
        <button type="button" role="tab" aria-selected={view === "phone"} className="for-phone" onClick={() => setView("phone")}>
          On a phone
        </button>
        <button type="button" role="tab" aria-selected={view === "computer"} className="for-computer" onClick={() => setView("computer")}>
          On a computer
        </button>
      </div>
      <ul className="ob-rows list-phone">
          <Row icon={<IconHome size={18} />} name="Home">
            Your vehicle&apos;s dashboard: totals, cost {perDist}, what&apos;s due.
          </Row>
          <Row icon={<IconPump size={18} />} name="Fuel (or Charging for EVs)">
            Every fill-up or charge, with fuel economy or efficiency.
          </Row>
          <Row icon={<span className="ob-fab">+</span>} name="The yellow + button">
            Log anything fast: a fill-up, charge, repair, insurance payment or reminder.
          </Row>
          <Row icon={<IconBell size={18} />} name="Reminders">
            Renewals and service coming up, most urgent first.
          </Row>
          <Row icon={<IconMore size={18} />} name="More">
            Maintenance, Recurring &amp; other costs, Reports, Vehicle profile, Garage, Account, theme and sign out.
          </Row>
        </ul>
        <ul className="ob-rows list-computer">
          <Row icon={<IconHome size={18} />} name="Home · Garage · Account (top right)">
            Home opens the vehicle you used last, Garage lists all your vehicles, Account holds your settings. The ? replays this tour.
          </Row>
          <Row icon={<IconGauge size={18} />} name="Dashboard">
            The overview for one vehicle, plus a quick fill-up or quick charge box.
          </Row>
          <Row icon={<IconPump size={18} />} name="Fuel · Charging · Battery">
            Fill-ups for gas, diesel and hybrids; charging and battery health for EVs and plug-in hybrids.
          </Row>
          <Row icon={<IconWrench size={18} />} name="Maintenance · Recurring & Other">
            Repairs and service; insurance, registration, parking, tolls, financing and everything else.
          </Row>
          <Row icon={<IconChart size={18} />} name="Reminders · Reports · Vehicle">
            What&apos;s due, where the money goes, and the vehicle&apos;s details and renewal dates.
          </Row>
        </ul>
    </div>
  );
}

export function Onboarding({ firstName, hasVehicles, replay, units, trialDaysLeft, isPro }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const [preset, setPreset] = useState(
    () =>
      UNIT_PRESETS.find(
        (p) =>
          p.prefs.distanceUnit === units.distanceUnit &&
          p.prefs.volumeUnit === units.volumeUnit &&
          p.prefs.economyUnit === units.economyUnit &&
          p.currency === units.currency,
      )?.id ?? null,
  );

  const mi = units.distanceUnit === "mi";
  const perDist = mi ? "per mile" : "per km";
  const volWord = units.volumeUnit === "L" ? "litres" : "gallons";
  const distWord = mi ? "miles" : "kilometres";

  const steps: Step[] = [
    {
      key: "welcome",
      eyebrow: "Welcome",
      title: firstName ? `Welcome to KeyStub, ${firstName}!` : "Welcome to KeyStub!",
      body: (
        <>
          <p>
            KeyStub keeps the tab on everything your vehicles cost, so you always know the real number: {mi ? "per mile" : "per kilometre"}, per month and in total.
          </p>
          <p>This quick tour shows how it works and what each menu is for. It takes about a minute.</p>
          {isPro && trialDaysLeft > 0 && (
            <p className="ob-note">You have {trialDaysLeft} days of Pro free, with no card needed. Everything in this tour works on the Free plan too.</p>
          )}
        </>
      ),
      visual: (
        <PhoneVisual label="A KeyStub dashboard">
          <DashboardUI className="on" />
        </PhoneVisual>
      ),
    },
    {
      key: "garage",
      eyebrow: "Step 1 · Your garage",
      title: "Start by adding your vehicles",
      body: (
        <>
          <p>Add each vehicle you own: cars, trucks, SUVs, motorcycles, hybrids and EVs. Each one gets its own dashboard and history.</p>
          <ul className="ob-list">
            <li>Type the details in, or enter the VIN and tap Look up to fill in the year, make and model. The VIN is optional.</li>
            <li>Choose the powertrain (gas, diesel, hybrid, plug-in hybrid or electric) so you see the right logs.</li>
            <li>
              <b>Garage</b> shows all your vehicles; <b>Home</b> always takes you back to the one you used last.
            </li>
          </ul>
        </>
      ),
      visual: (
        <PhoneVisual label="Adding a vehicle">
          <AddVehicleUI className="on" />
        </PhoneVisual>
      ),
    },
    {
      key: "log",
      eyebrow: "Step 2 · Logging",
      title: "Log costs in seconds",
      body: (
        <>
          <p>Tap the yellow + (on a phone) or the “+ Add” buttons to record:</p>
          <ul className="ob-rows compact">
            <Row icon={<IconPump size={18} />} name="Fill-ups">
              Total and odometer is enough. Add {volWord} for fuel economy.
            </Row>
            <Row icon={<IconPlug size={18} />} name="Charging (EVs)">
              kWh and where. Leave the cost blank at home and it&apos;s worked out from your rate.
            </Row>
            <Row icon={<IconWrench size={18} />} name="Maintenance and repairs">
              Oil changes, tires, brakes, anything, with parts, labour and the shop.
            </Row>
            <Row icon={<IconShield size={18} />} name="Insurance, registration and other">
              Plus parking, tolls, roadside assistance, financing and more.
            </Row>
          </ul>
          <p className="ob-note">Add the odometer when you can: it powers cost {perDist} and fuel economy. KeyStub warns you about duplicates and odometer typos before saving.</p>
        </>
      ),
      visual: (
        <PhoneVisual label="Logging a fill-up">
          <FillUpUI className="on" />
        </PhoneVisual>
      ),
    },
    {
      key: "insights",
      eyebrow: "Step 3 · Your numbers",
      title: "See where the money goes",
      body: (
        <>
          <p>
            The <b>Dashboard</b> shows this month, year to date, your total cost of ownership, average monthly cost and cost {perDist}, plus a breakdown by
            category.
          </p>
          <p>
            <b>Reports</b> adds monthly trends, totals for any date range, a keep-vs-replace calculator and a clean printout or PDF. Pro adds a printable
            service history for when you sell.
          </p>
        </>
      ),
      visual: (
        <div className="ob-tiles" aria-hidden="true">
          {[
            [`Cost ${perDist}`, mi ? "$0.34" : "$0.21", "fuel, repairs, insurance, all of it"],
            ["Per month", "$412", "average since you started"],
            ["Year to date", "$3,870", "all categories"],
            ["Total cost", "$19,269", "running costs so far"],
          ].map(([k, v, s]) => (
            <div className="card stat" key={k}>
              <div className="label">{k}</div>
              <div className="value tabular">{v}</div>
              <div className="sub">{s}</div>
            </div>
          ))}
          <p className="ob-caption">Example numbers</p>
        </div>
      ),
    },
    {
      key: "reminders",
      eyebrow: "Step 4 · Reminders",
      title: "Never miss a renewal",
      body: (
        <>
          <p>KeyStub reminds you before things are due:</p>
          <ul className="ob-list">
            <li>Insurance and registration renewals, from the dates on the Vehicle tab.</li>
            <li>Next service, from the date or odometer on a maintenance record.</li>
            <li>Anything else you add yourself, by date, by odometer or both.</li>
          </ul>
          <p className="ob-note">You choose how early “Due soon” kicks in, in Account → Preferences.</p>
        </>
      ),
      visual: (
        <PhoneVisual label="Upcoming reminders">
          <RemindersUI className="on" />
        </PhoneVisual>
      ),
    },
    {
      key: "menus",
      eyebrow: "Step 5 · Finding your way",
      title: "What each menu is for",
      body: <p>The layout adapts to your screen. Here&apos;s what everything does:</p>,
      visual: (
        <div className="ob-panel">
          <MenusStep perDist={perDist} />
        </div>
      ),
    },
    {
      key: "settings",
      eyebrow: "Step 6 · Make it yours",
      title: "Your settings live in Account",
      body: <p>Open Account (top right on a computer, or More on a phone) any time to change:</p>,
      visual: (
        <div className="ob-panel">
          <ul className="ob-rows">
            <Row icon={<IconScale size={18} />} name="Units & currency">
              Kilometres or miles, litres or gallons, L/100 km or MPG, and your currency.
            </Row>
            <Row icon={<IconGauge size={18} />} name="Appearance">
              Light, dark, or match your device.
            </Row>
            <Row icon={<IconBell size={18} />} name="Reminders">
              How many days or {distWord} ahead counts as “due soon”.
            </Row>
            <Row icon={<IconBattery size={18} />} name="Energy">
              Your home electricity rate and the gas car EV savings are compared against.
            </Row>
            <Row icon={<IconDownload size={18} />} name="Your data">
              Download everything as a spreadsheet or backup, any time, on any plan.
            </Row>
            <Row icon={<IconHome size={18} />} name="Help &amp; feedback">
              Replay this tour whenever you like.
            </Row>
          </ul>
        </div>
      ),
    },
    {
      key: "start",
      eyebrow: replay ? "That's the tour" : "Last step",
      title: replay ? "You're all caught up" : "Let's set you up",
      body: replay ? (
        <p>You can replay this tour any time from Account → Help & feedback, or the ? at the top of the app.</p>
      ) : (
        <>
          <p>First, check your units. We guessed from where you signed up, and you can change them any time in Account.</p>
          <p>Then add your first vehicle and log a cost or two. The numbers fill in as you go.</p>
        </>
      ),
      visual: replay ? (
        <PhoneVisual label="A KeyStub dashboard">
          <DashboardUI className="on" />
        </PhoneVisual>
      ) : (
        <div className="ob-panel">
          <div className="label ob-panel-label">Units &amp; currency</div>
          <div className="seg-choice" role="radiogroup" aria-label="Units and currency">
            {UNIT_PRESETS.map((p) => (
              <label key={p.id} className={preset === p.id ? "on" : ""}>
                <input type="radio" name="ob-units" checked={preset === p.id} onChange={() => setPreset(p.id)} />
                {p.label}
              </label>
            ))}
          </div>
          <p className="ob-caption" style={{ textAlign: "left" }}>
            {preset === "us"
              ? "Miles, US gallons, MPG and US dollars."
              : preset === "uk"
                ? "Miles, litres, UK MPG and pounds."
                : preset === "ca"
                  ? "Kilometres, litres, L/100 km and Canadian dollars."
                  : "A custom mix. Fine-tune it in Account → Preferences."}
          </p>
        </div>
      ),
    },
  ];

  const last = i === steps.length - 1;
  const step = steps[i];

  /** Save units (if changed), mark the tour done, then go where the button says. */
  const finish = useCallback(
    async (href: string) => {
      setBusy(true);
      if (!replay && preset) {
        const p = UNIT_PRESETS.find((x) => x.id === preset)!;
        const changed =
          p.prefs.distanceUnit !== units.distanceUnit ||
          p.prefs.volumeUnit !== units.volumeUnit ||
          p.prefs.economyUnit !== units.economyUnit ||
          p.currency !== units.currency;
        if (changed) {
          const r = await saveUnitPrefs({ ...p.prefs, currency: p.currency });
          if (!r.ok) toast("Couldn't save your units. You can set them in Account.", true);
        }
      }
      await completeOnboarding();
      router.push(href);
      router.refresh();
    },
    [preset, replay, router, toast, units],
  );

  // Each step starts at the top (matters on phones, where steps scroll).
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [i]);

  // Arrow keys move between steps.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input, textarea, select")) return;
      if (e.key === "ArrowRight") setI((n) => Math.min(n + 1, steps.length - 1));
      if (e.key === "ArrowLeft") setI((n) => Math.max(n - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [steps.length]);

  const exitHref = hasVehicles ? "/app/home" : "/app?garage=1";

  return (
    <div className="ob">
      <header className="ob-top">
        <Logo size={18} tone="app" />
        <button type="button" className="btn ghost sm" disabled={busy} onClick={() => finish(exitHref)}>
          {replay ? "Close" : "Skip tour"}
        </button>
      </header>

      <main className="ob-main" aria-live="polite">
        <section className="ob-text" key={step.key}>
          <div className="ob-eyebrow">{step.eyebrow}</div>
          <h1>{step.title}</h1>
          <div className="ob-body">{step.body}</div>
        </section>
        <div className="ob-art" key={`${step.key}-art`}>
          {step.visual}
        </div>
      </main>

      <footer className="ob-foot">
        <div className="ob-dots" role="tablist" aria-label="Tour steps">
          {steps.map((s, n) => (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={n === i}
              aria-label={`Step ${n + 1} of ${steps.length}: ${s.title}`}
              className={n === i ? "on" : n < i ? "done" : ""}
              onClick={() => setI(n)}
            />
          ))}
        </div>
        <div className="ob-nav">
          {i > 0 && (
            <button type="button" className="btn" onClick={() => setI(i - 1)}>
              Back
            </button>
          )}
          {!last ? (
            <button type="button" className="btn primary" onClick={() => setI(i + 1)}>
              {i === 0 ? "Show me around" : "Next"}
            </button>
          ) : replay ? (
            <button type="button" className="btn primary" disabled={busy} onClick={() => finish(exitHref)}>
              Back to KeyStub
            </button>
          ) : hasVehicles ? (
            <button type="button" className="btn primary" disabled={busy} onClick={() => finish("/app/home")}>
              {busy ? "Saving…" : "Go to my dashboard"}
            </button>
          ) : (
            <>
              <button type="button" className="btn" disabled={busy} onClick={() => finish("/app?garage=1")}>
                Look around first
              </button>
              <button type="button" className="btn primary" disabled={busy} onClick={() => finish("/app/vehicles/new")}>
                {busy ? "Saving…" : "Add my first vehicle"}
              </button>
            </>
          )}
        </div>
      </footer>
      {!replay && last && !hasVehicles && (
        <p className="ob-restore">
          Moving from another device or the original tracker?{" "}
          <button type="button" className="link-btn" disabled={busy} onClick={() => finish("/app/account/data#import")}>
            Restore a backup file
          </button>
        </p>
      )}
    </div>
  );
}
