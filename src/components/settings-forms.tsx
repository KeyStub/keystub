"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { saveReminderPrefs } from "@/server/actions";
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
