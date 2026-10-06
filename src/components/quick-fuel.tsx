"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { todayISO } from "@/lib/format";
import { saveFuel } from "@/server/actions";
import { useConfirm, useToast } from "./ui";

/** The 10-second fill-up: total + odometer at the pump, everything else optional. */
export function QuickFuel({ vehicleId, lastStation }: { vehicleId: string; lastStation: string | null }) {
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = { ...Object.fromEntries(new FormData(e.currentTarget)), date: todayISO(), fillType: "full" };
    setBusy(true);
    let res = await saveFuel(vehicleId, null, data, false);
    if (!res.ok && "warnings" in res) {
      const go = await confirm({ title: "Double-check this entry", message: res.warnings.join(" "), confirmLabel: "Save anyway" });
      res = go ? await saveFuel(vehicleId, null, data, true) : { ok: false, error: "" };
    }
    setBusy(false);
    if (!res.ok) {
      if ("error" in res && res.error) toast(res.error, true);
      return;
    }
    toast("Fill-up logged.");
    formRef.current?.reset();
    router.refresh();
  }

  return (
    <form ref={formRef} className="card" onSubmit={onSubmit}>
      <div className="row3">
        <div className="field" style={{ marginBottom: 8 }}>
          <label htmlFor="q-total">Total $</label>
          <input className="input" id="q-total" name="totalPaid" type="number" step="0.01" min={0.01} required inputMode="decimal" />
        </div>
        <div className="field" style={{ marginBottom: 8 }}>
          <label htmlFor="q-litres">Litres</label>
          <input className="input" id="q-litres" name="litres" type="number" step="0.001" min={0} inputMode="decimal" />
        </div>
        <div className="field" style={{ marginBottom: 8 }}>
          <label htmlFor="q-odo">Odometer</label>
          <input className="input" id="q-odo" name="odometer" type="number" min={0} inputMode="numeric" />
        </div>
      </div>
      <input type="hidden" name="station" value={lastStation ?? ""} />
      <button className="btn primary block" disabled={busy}>
        {busy ? "Saving…" : `Log full tank today${lastStation ? ` at ${lastStation}` : ""}`}
      </button>
    </form>
  );
}
