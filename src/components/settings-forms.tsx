"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { saveEnergyPrefs, saveReminderPrefs } from "@/server/actions";
import { ThemeSegmented } from "./theme-toggle";
import { Field, useToast } from "./ui";

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
        <Field label="Kilometres ahead" htmlFor="lead-km" hint="for reminders set by odometer">
          <input className="input" id="lead-km" name="leadKm" type="number" min={0} max={20000} step={50} required defaultValue={leadKm} />
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
      <Field label="Home electricity ($ per kWh)" htmlFor="en-kwh" hint="All-in rate from your power bill, including delivery. Check your bill: it varies a lot by province and state.">
        <input className="input" id="en-kwh" name="homeKwhPrice" type="number" step="0.001" min={0} max={5} required inputMode="decimal" defaultValue={homeKwhPrice} />
      </Field>
      <div className="row2">
        <Field label="Comparison car (L/100 km)" htmlFor="en-l100" hint="What a gas version of your vehicle uses, e.g. 9">
          <input className="input" id="en-l100" name="compareL100" type="number" step="0.1" min={1} max={40} required inputMode="decimal" defaultValue={compareL100} />
        </Field>
        <Field label="Gas price ($ per litre)" htmlFor="en-fuel">
          <input className="input" id="en-fuel" name="compareFuelPrice" type="number" step="0.01" min={0} max={10} required inputMode="decimal" defaultValue={compareFuelPrice} />
        </Field>
      </div>
      <button className="btn" disabled={busy}>
        {busy ? "Saving…" : "Save energy settings"}
      </button>
    </form>
  );
}
