"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CURRENCIES, DISTANCE_UNITS, ECONOMY_UNITS, UNIT_PRESETS, VOLUME_UNITS, type UnitPrefs } from "@/lib/units";
import { saveEnergyPrefs, saveReminderPrefs, saveUnitPrefs } from "@/server/actions";
import { ThemeSegmented } from "./theme-toggle";
import { Field, useToast } from "./ui";
import { useFmt } from "./units-provider";

export function AppearanceSettings() {
  return (
    <div className="card">
      <p className="muted" style={{ margin: "0 0 10px", fontSize: 13.5 }}>
        Choose a theme, or match your phone or computer&apos;s setting. Saved on this device.
      </p>
      <ThemeSegmented />
    </div>
  );
}

export function ReminderSettings({ leadDays, leadKm }: { leadDays: number; leadKm: number }) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const u = useFmt();
  const router = useRouter();
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const res = await saveReminderPrefs(Object.fromEntries(new FormData(e.currentTarget)));
    setBusy(false);
    if (!res.ok) return toast("error" in res ? res.error : "Couldn't save.", true);
    toast("Reminder settings saved.");
    router.refresh();
  }
  return (
    <form className="card" onSubmit={onSubmit}>
      <p className="muted" style={{ margin: "0 0 12px", fontSize: 13.5 }}>
        Renewals, service and other reminders show as <b>Due soon</b> when they&apos;re this close. Whichever comes first wins.
      </p>
      <div className="row2">
        <Field label="Days ahead" htmlFor="lead-days" hint="e.g. 30 for a month's notice">
          <input className="input" id="lead-days" name="leadDays" type="number" min={1} max={365} required defaultValue={leadDays} />
        </Field>
        <Field label={`${u.distWord[0].toUpperCase() + u.distWord.slice(1)} ahead`} htmlFor="lead-km" hint="for reminders set by odometer">
          <input className="input" id="lead-km" name="leadKm" type="number" min={0} max={20000} step={10} required defaultValue={u.distInput(leadKm)} />
        </Field>
      </div>
      <button className="btn" disabled={busy}>
        {busy ? "Saving…" : "Save reminder settings"}
      </button>
    </form>
  );
}

/** Home electricity price (estimates home charging cost) and the gas car EV savings are compared against. */
export function EnergySettings({ homeKwhPrice, compareL100, compareFuelPrice }: { homeKwhPrice: number; compareL100: number; compareFuelPrice: number }) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const u = useFmt();
  const router = useRouter();
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const res = await saveEnergyPrefs(Object.fromEntries(new FormData(e.currentTarget)));
    setBusy(false);
    if (!res.ok) return toast("error" in res ? res.error : "Couldn't save.", true);
    toast("Energy settings saved.");
    router.refresh();
  }
  return (
    <form className="card" onSubmit={onSubmit}>
      <p className="muted" style={{ margin: "0 0 12px", fontSize: 13.5 }}>
        For electric and plug-in hybrid vehicles. Home charges logged without a cost are estimated at your rate; your savings are compared against a similar gas car.
      </p>
      <Field label={`Home electricity (${u.symbol} per kWh)`} htmlFor="en-kwh" hint="All-in rate from your power bill, including delivery. Check your bill: it varies a lot by province and state.">
        <input className="input" id="en-kwh" name="homeKwhPrice" type="number" step="0.001" min={0} max={5} required inputMode="decimal" defaultValue={homeKwhPrice} />
      </Field>
      <div className="row2">
        <Field label={`Comparison car (${u.econUnit})`} htmlFor="en-l100" hint="What a gas version of your vehicle gets">
          <input className="input" id="en-l100" name="compareL100" type="number" step="0.1" min={0.1} required inputMode="decimal" defaultValue={u.econInput(compareL100)} />
        </Field>
        <Field label={`Gas price (${u.perVolLabel})`} htmlFor="en-fuel">
          <input className="input" id="en-fuel" name="compareFuelPrice" type="number" step="0.001" min={0} required inputMode="decimal" defaultValue={u.perVolInput(compareFuelPrice)} />
        </Field>
      </div>
      <button className="btn" disabled={busy}>
        {busy ? "Saving…" : "Save energy settings"}
      </button>
    </form>
  );
}

/** Units and currency. Changing them never alters stored data (it's kept in metric). */
export function UnitSettings({ prefs }: { prefs: UnitPrefs }) {
  const [busy, setBusy] = useState(false);
  const [p, setP] = useState(prefs);
  const toast = useToast();
  const router = useRouter();
  const set = (k: keyof UnitPrefs) => (e: { target: { value: string } }) => setP((x) => ({ ...x, [k]: e.target.value }));
  const preset = UNIT_PRESETS.find(
    (x) => x.prefs.distanceUnit === p.distanceUnit && x.prefs.volumeUnit === p.volumeUnit && x.prefs.economyUnit === p.economyUnit && x.currency === p.currency,
  );
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const res = await saveUnitPrefs(p);
    setBusy(false);
    if (!res.ok) return toast("error" in res ? res.error : "Couldn't save.", true);
    toast("Units saved.");
    router.refresh();
  }
  return (
    <form className="card" onSubmit={onSubmit}>
      <p className="muted" style={{ margin: "0 0 12px", fontSize: 13.5 }}>
        How distances, fuel and money are shown and entered. Switching never changes your records, and you can switch back any time.
      </p>
      <div className="field">
        <span className="label">Quick set</span>
        <div className="seg-choice" role="radiogroup" aria-label="Region preset">
          {UNIT_PRESETS.map((x) => (
            <label key={x.id} className={preset?.id === x.id ? "on" : ""}>
              <input type="radio" name="preset" checked={preset?.id === x.id} onChange={() => setP({ ...x.prefs, currency: x.currency })} />
              {x.label}
            </label>
          ))}
        </div>
      </div>
      <div className="row2">
        <Field label="Distance" htmlFor="u-dist">
          <select className="select" id="u-dist" value={p.distanceUnit} onChange={set("distanceUnit")}>
            {DISTANCE_UNITS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Fuel volume" htmlFor="u-vol">
          <select className="select" id="u-vol" value={p.volumeUnit} onChange={set("volumeUnit")}>
            {VOLUME_UNITS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="row2">
        <Field label="Fuel economy" htmlFor="u-econ">
          <select className="select" id="u-econ" value={p.economyUnit} onChange={set("economyUnit")}>
            {ECONOMY_UNITS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Currency" htmlFor="u-cur" hint="Amounts aren't converted, so pick the currency you pay in.">
          <select className="select" id="u-cur" value={p.currency} onChange={set("currency")}>
            {CURRENCIES.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <button className="btn" disabled={busy}>
        {busy ? "Saving…" : "Save units"}
      </button>
    </form>
  );
}
