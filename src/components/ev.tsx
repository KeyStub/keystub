"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { fmtDate, numFmt, todayISO } from "@/lib/format";
import { deleteBatteryCheck, saveBatteryCheck, saveCharge } from "@/server/actions";
import type { BatteryCheck } from "@/server/data";
import { Field, IconButton, Modal, useConfirm, useOpenOnAdd, useToast } from "./ui";

/** Plug-in version of the quick fill-up: kWh + where, cost estimated at home if left blank. */
export function QuickCharge({ vehicleId, homeKwhPrice }: { vehicleId: string; homeKwhPrice: number }) {
  const [busy, setBusy] = useState(false);
  const [loc, setLoc] = useState("home");
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = { ...Object.fromEntries(new FormData(e.currentTarget)), date: todayISO() };
    setBusy(true);
    let res = await saveCharge(vehicleId, null, data, false);
    if (!res.ok && "warnings" in res) {
      const go = await confirm({ title: "Double-check this entry", message: res.warnings.join(" "), confirmLabel: "Save anyway" });
      res = go ? await saveCharge(vehicleId, null, data, true) : { ok: false, error: "" };
    }
    setBusy(false);
    if (!res.ok) {
      if ("error" in res && res.error) toast(res.error, true);
      return;
    }
    toast("Charge logged.");
    formRef.current?.reset();
    setLoc("home");
    router.refresh();
  }

  return (
    <form ref={formRef} className="card" onSubmit={onSubmit}>
      <div className="row3">
        <div className="field" style={{ marginBottom: 8 }}>
          <label htmlFor="qc-kwh">kWh added</label>
          <input className="input" id="qc-kwh" name="kwh" type="number" step="0.01" min={0.01} required inputMode="decimal" />
        </div>
        <div className="field" style={{ marginBottom: 8 }}>
          <label htmlFor="qc-loc">Where</label>
          <select className="select" id="qc-loc" name="location" value={loc} onChange={(e) => setLoc(e.target.value)}>
            <option value="home">Home</option>
            <option value="work">Work</option>
            <option value="public">Public L2</option>
            <option value="fast">DC fast</option>
          </select>
        </div>
        <div className="field" style={{ marginBottom: 8 }}>
          <label htmlFor="qc-cost">Cost $</label>
          <input
            className="input"
            id="qc-cost"
            name="cost"
            type="number"
            step="0.01"
            min={0}
            inputMode="decimal"
            required={loc !== "home"}
            placeholder={loc === "home" ? "auto" : ""}
          />
        </div>
      </div>
      <div className="field" style={{ marginBottom: 8 }}>
        <label htmlFor="qc-odo">Odometer (optional)</label>
        <input className="input" id="qc-odo" name="odometer" type="number" min={0} inputMode="numeric" />
      </div>
      <button className="btn primary block" disabled={busy}>
        {busy ? "Saving…" : "Log charge today"}
      </button>
      {loc === "home" && (
        <p className="muted" style={{ fontSize: 12, margin: "8px 0 0" }}>
          Blank cost at home is estimated at ${homeKwhPrice.toFixed(3)}/kWh.
        </p>
      )}
    </form>
  );
}

/** Battery health over time: the car's state-of-health %, and/or the range it shows at 100%. */
export function BatteryLog({ vehicleId, rows, ratedRangeKm }: { vehicleId: string; rows: BatteryCheck[]; ratedRangeKm: number | null }) {
  const [editing, setEditing] = useState<BatteryCheck | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const ex = editing ?? null;
  useOpenOnAdd(() => setEditing(null));

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const res = await saveBatteryCheck(vehicleId, ex?.id ?? null, Object.fromEntries(new FormData(e.currentTarget)));
    setBusy(false);
    if (!res.ok) return toast("error" in res ? res.error : "Couldn't save.", true);
    toast(ex ? "Battery check updated." : "Battery check saved.");
    setEditing(undefined);
    router.refresh();
  }

  async function remove(r: BatteryCheck) {
    const ok = await confirm({ title: "Delete this battery check?", message: `From ${fmtDate(r.date)}. This can't be undone.`, confirmLabel: "Delete", danger: true });
    if (!ok) return;
    const res = await deleteBatteryCheck(r.id);
    if (!res.ok) return toast("error" in res ? res.error : "Couldn't delete.", true);
    toast("Deleted.");
    router.refresh();
  }

  return (
    <>
      <div className="toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h3 className="section-title" style={{ margin: 0 }}>
          Battery checks
        </h3>
        <button className="btn primary" onClick={() => setEditing(null)}>
          + Add check
        </button>
      </div>
      <div className="card">
        {rows.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No checks yet. Every few months, note the battery health % (from the car, the dealer or an app) or the range the car shows at 100%. Over time this
            shows how your battery is ageing.
          </p>
        ) : (
          <div className="list">
            {rows.map((r) => (
              <div className="list-item" key={r.id}>
                <div className="l-main">
                  <div className="l-title">{fmtDate(r.date)}</div>
                  <div className="l-sub">
                    {[r.odometer != null ? `${numFmt(r.odometer)} km` : null, r.notes].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
                <div className="l-val tabular" style={{ textAlign: "right" }}>
                  {r.healthPct != null && <div>{r.healthPct.toFixed(1)}% health</div>}
                  {r.rangeAtFullKm != null && (
                    <div className="muted" style={{ fontSize: 12.5 }}>
                      {numFmt(r.rangeAtFullKm)} km at 100%
                      {ratedRangeKm ? ` (${Math.round((r.rangeAtFullKm / ratedRangeKm) * 100)}% of rated)` : ""}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <IconButton kind="edit" label="Edit" onClick={() => setEditing(r)} />
                  <IconButton kind="trash" label="Delete" onClick={() => remove(r)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Modal
        open={editing !== undefined}
        title={ex ? "Edit battery check" : "Add battery check"}
        onClose={() => setEditing(undefined)}
        footer={
          <>
            <button className="btn" onClick={() => setEditing(undefined)}>
              Cancel
            </button>
            <button className="btn primary" disabled={busy} onClick={() => formRef.current?.requestSubmit()}>
              {busy ? "Saving…" : "Save"}
            </button>
          </>
        }
      >
        <form ref={formRef} onSubmit={onSubmit} key={ex?.id ?? "new"}>
          <div className="row2">
            <Field label="Date" htmlFor="bc-date">
              <input className="input" id="bc-date" name="date" type="date" required defaultValue={ex?.date ?? todayISO()} />
            </Field>
            <Field label="Odometer (km)" htmlFor="bc-odo">
              <input className="input" id="bc-odo" name="odometer" type="number" min={0} inputMode="numeric" defaultValue={ex?.odometer ?? ""} />
            </Field>
          </div>
          <div className="row2">
            <Field label="Battery health (%)" htmlFor="bc-h" hint="State of health (SoH), if the car, dealer or an app shows it.">
              <input className="input" id="bc-h" name="healthPct" type="number" step="0.1" min={1} max={110} inputMode="decimal" defaultValue={ex?.healthPct ?? ""} />
            </Field>
            <Field label="Range at 100% (km)" htmlFor="bc-r" hint="The estimate shown after a full charge.">
              <input className="input" id="bc-r" name="rangeAtFullKm" type="number" min={1} inputMode="numeric" defaultValue={ex?.rangeAtFullKm ?? ""} />
            </Field>
          </div>
          <Field label="Notes" htmlFor="bc-notes">
            <textarea className="input" id="bc-notes" name="notes" rows={2} defaultValue={ex?.notes ?? ""} placeholder="e.g. Dealer battery report, summer temps" />
          </Field>
          <button type="submit" hidden />
        </form>
      </Modal>
    </>
  );
}
