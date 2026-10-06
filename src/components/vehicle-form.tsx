"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { POWERTRAINS, usesCharging } from "@/lib/calc";
import { centsToInput } from "@/lib/format";
import { saveVehicle } from "@/server/actions";
import { Field, useToast } from "./ui";
import { useFmt } from "./units-provider";

type V = {
  id?: string;
  nickname?: string | null;
  powertrain?: string;
  batteryKwh?: number | null;
  ratedRangeKm?: number | null;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  trim?: string | null;
  vin?: string | null;
  plate?: string | null;
  purchasePriceCents?: number | null;
  purchaseDate?: string | null;
  currentOdometer?: number | null;
  insuranceProvider?: string | null;
  insurancePolicyCostCents?: number | null;
  insuranceRenewalDate?: string | null;
  registrationRenewalDate?: string | null;
  notes?: string | null;
};

export function VehicleForm({ vehicle }: { vehicle?: V }) {
  const v = vehicle ?? {};
  const router = useRouter();
  const toast = useToast();
  const u = useFmt();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vin, setVin] = useState(v.vin ?? "");
  const [powertrain, setPowertrain] = useState(v.powertrain ?? "gas");
  const [decoded, setDecoded] = useState<{ year?: string; make?: string; model?: string; trim?: string; powertrain?: string } | null>(null);

  async function decodeVin() {
    if (vin.trim().length !== 17) return toast("A VIN is 17 characters.", true);
    const r = await fetch(`/api/vin/${encodeURIComponent(vin.trim())}`);
    if (!r.ok) return toast("Couldn't decode that VIN.", true);
    const d = await r.json();
    setDecoded(d);
    if (d.powertrain && !v.id) setPowertrain(d.powertrain);
    const form = document.getElementById("vehicle-form") as HTMLFormElement;
    for (const k of ["year", "make", "model", "trim"] as const) {
      const input = form.elements.namedItem(k) as HTMLInputElement | null;
      if (input && d[k] && !input.value) input.value = d[k];
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const res = await saveVehicle(v.id ?? null, data);
    setBusy(false);
    if (!res.ok) return setError("error" in res ? res.error : "Couldn't save.");
    toast("Vehicle saved.");
    if (!v.id && res.id) router.push(`/app/v/${res.id}`);
    else router.refresh();
  }

  return (
    <form id="vehicle-form" onSubmit={onSubmit}>
      {error && <div className="note error">{error}</div>}
      <h3 className="section-title">Vehicle</h3>
      <div className="card">
        <div className="row2">
          <Field label="VIN (optional)" hint="Private. Use “Look up” to fill in year, make and model." htmlFor="vin">
            <div style={{ display: "flex", gap: 6 }}>
              <input className="input" id="vin" name="vin" value={vin} onChange={(e) => setVin(e.target.value.toUpperCase())} maxLength={17} />
              <button type="button" className="btn sm" onClick={decodeVin}>
                Look up
              </button>
            </div>
          </Field>
          <Field label="Nickname (optional)" htmlFor="nickname">
            <input className="input" id="nickname" name="nickname" defaultValue={v.nickname ?? ""} placeholder="e.g. Daily driver" />
          </Field>
        </div>
        {decoded && (
          <div className="note info">
            VIN decoded: {[decoded.year, decoded.make, decoded.model, decoded.trim].filter(Boolean).join(" ") || "no details found"}
            {decoded.powertrain ? ` · ${POWERTRAINS.find((p) => p.id === decoded.powertrain)?.label}` : ""}
          </div>
        )}
        <Field label="Powertrain" htmlFor="powertrain" hint="Sets which logs you see: fill-ups, charging, or both.">
          <div className="seg-choice" role="radiogroup" aria-label="Powertrain">
            {POWERTRAINS.map((p) => (
              <label key={p.id} className={powertrain === p.id ? "on" : ""}>
                <input type="radio" name="powertrain" value={p.id} checked={powertrain === p.id} onChange={() => setPowertrain(p.id)} />
                {p.label}
              </label>
            ))}
          </div>
        </Field>
        {usesCharging(powertrain) && (
          <div className="row2">
            <Field label="Usable battery (kWh)" htmlFor="batteryKwh" hint="Optional. From the spec sheet, e.g. 77.4">
              <input className="input" id="batteryKwh" name="batteryKwh" type="number" step="0.1" min={1} max={300} inputMode="decimal" defaultValue={v.batteryKwh ?? ""} />
            </Field>
            <Field label={`Rated range when new (${u.distUnit})`} htmlFor="ratedRangeKm" hint="Optional. Used to compare against your real range.">
              <input className="input" id="ratedRangeKm" name="ratedRangeKm" type="number" min={1} max={2000} inputMode="numeric" defaultValue={u.distInput(v.ratedRangeKm)} />
            </Field>
          </div>
        )}
        <div className="row2">
          <Field label="Year" htmlFor="year">
            <input className="input" id="year" name="year" type="number" min={1900} max={2100} defaultValue={v.year ?? ""} />
          </Field>
          <Field label="Make" htmlFor="make">
            <input className="input" id="make" name="make" defaultValue={v.make ?? ""} />
          </Field>
        </div>
        <div className="row2">
          <Field label="Model" htmlFor="model">
            <input className="input" id="model" name="model" defaultValue={v.model ?? ""} />
          </Field>
          <Field label="Trim" htmlFor="trim">
            <input className="input" id="trim" name="trim" defaultValue={v.trim ?? ""} />
          </Field>
        </div>
        <div className="row3">
          <Field label="Purchase date" htmlFor="purchaseDate">
            <input className="input" id="purchaseDate" name="purchaseDate" type="date" defaultValue={v.purchaseDate ?? ""} />
          </Field>
          <Field label={u.moneyLabel("Purchase price")} htmlFor="purchasePrice">
            <input className="input" id="purchasePrice" name="purchasePrice" type="number" step="0.01" min={0} defaultValue={centsToInput(v.purchasePriceCents)} />
          </Field>
          <Field label={`Current odometer (${u.distUnit})`} htmlFor="currentOdometer">
            <input className="input" id="currentOdometer" name="currentOdometer" type="number" min={0} defaultValue={u.distInput(v.currentOdometer)} />
          </Field>
        </div>
        <Field label="Licence plate" hint="Private — only you can see it." htmlFor="plate">
          <input className="input" id="plate" name="plate" defaultValue={v.plate ?? ""} />
        </Field>
      </div>

      <h3 className="section-title">Insurance &amp; registration</h3>
      <div className="card">
        <div className="row2">
          <Field label="Insurance provider" htmlFor="insuranceProvider">
            <input className="input" id="insuranceProvider" name="insuranceProvider" defaultValue={v.insuranceProvider ?? ""} />
          </Field>
          <Field label={u.moneyLabel("Insurance policy cost")} htmlFor="insurancePolicyCost">
            <input
              className="input"
              id="insurancePolicyCost"
              name="insurancePolicyCost"
              type="number"
              step="0.01"
              min={0}
              defaultValue={centsToInput(v.insurancePolicyCostCents)}
            />
          </Field>
        </div>
        <div className="row2">
          <Field label="Insurance renewal date" hint="Shows up in Reminders." htmlFor="insuranceRenewalDate">
            <input className="input" id="insuranceRenewalDate" name="insuranceRenewalDate" type="date" defaultValue={v.insuranceRenewalDate ?? ""} />
          </Field>
          <Field label="Registration renewal date" hint="Shows up in Reminders." htmlFor="registrationRenewalDate">
            <input
              className="input"
              id="registrationRenewalDate"
              name="registrationRenewalDate"
              type="date"
              defaultValue={v.registrationRenewalDate ?? ""}
            />
          </Field>
        </div>
      </div>

      <h3 className="section-title">Notes</h3>
      <div className="card">
        <textarea className="input" name="notes" rows={3} defaultValue={v.notes ?? ""} aria-label="Notes" />
      </div>
      <div style={{ marginTop: 16 }}>
        <button className="btn primary" disabled={busy}>
          {busy ? "Saving…" : v.id ? "Save vehicle profile" : "Add vehicle"}
        </button>
      </div>
    </form>
  );
}
