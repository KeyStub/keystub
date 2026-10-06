"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ExportSummary } from "@/lib/legacy-import";
import { money } from "@/lib/format";
import { importLegacyBackup } from "@/server/actions";
import { useToast } from "./ui";

type Result = { expected: ExportSummary; written: ExportSummary; inserted: number; updated: number };

/**
 * Restore flow, same safety rules as the original: nothing is touched until you've seen a preview.
 * Step 1 runs the full import inside a transaction and rolls it back (dry run) to produce exact
 * counts; step 2 runs it for real and re-verifies totals before committing.
 */
export function ImportPanel({ vehicles }: { vehicles: { id: string; name: string }[] }) {
  const [json, setJson] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [target, setTarget] = useState("");
  const [preview, setPreview] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const router = useRouter();

  async function run(dryRun: boolean, text = json, tgt = target) {
    if (!text) return;
    setBusy(true);
    setError(null);
    const res = await importLegacyBackup(text, { targetVehicleId: tgt || undefined, dryRun });
    setBusy(false);
    if (!res.ok) {
      setPreview(null);
      return setError(res.error);
    }
    if (dryRun) return setPreview(res.result);
    toast(`Import complete — ${res.result.inserted} added, ${res.result.updated} updated. Totals verified.`);
    setJson(null);
    setPreview(null);
    setFileName("");
    router.push(res.result && vehicles.length === 0 ? "/app" : "/app?garage=1");
    router.refresh();
  }

  const row = (label: string, t: { count: number; cents: number }) => (
    <tr key={label}>
      <td>{label}</td>
      <td className="num tabular">{t.count}</td>
      <td className="num tabular">{money(t.cents)}</td>
    </tr>
  );

  return (
    <div className="card">
      <p style={{ marginTop: 0, fontSize: 14 }}>
        Upload a backup (<code>.json</code>) exported from the original Santa Fe Tracker. You&apos;ll see exactly what will be added before anything changes.
        Re-importing the same file updates records instead of duplicating them. Nothing is ever deleted.
      </p>
      <div className="row2">
        <div className="field">
          <label htmlFor="imp-file">Backup file</label>
          <input
            id="imp-file"
            type="file"
            accept="application/json,.json"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setFileName(f.name);
              const text = await f.text();
              setJson(text);
              await run(true, text);
            }}
          />
          {fileName && <div className="hint">{fileName}</div>}
        </div>
        <div className="field">
          <label htmlFor="imp-target">Import into</label>
          <select id="imp-target" className="select" value={target} onChange={(e) => {
              setTarget(e.target.value);
              if (json) run(true, json, e.target.value);
            }}>
            <option value="">A new vehicle (from the file)</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                Existing: {v.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && (
        <div className="note error" style={{ whiteSpace: "pre-wrap" }}>
          {error}
        </div>
      )}
      {preview && (
        <>
          <div className="note info">Preview — nothing has been saved yet.</div>
          <table className="data">
            <thead>
              <tr>
                <th>Records</th>
                <th className="num">Count</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {row("Fuel", preview.written.fuel)}
              {row("Maintenance", preview.written.maintenance)}
              {row("Insurance, registration & other", preview.written.costs)}
            </tbody>
          </table>
          <p className="muted" style={{ fontSize: 13 }}>
            {preview.inserted} new · {preview.updated} already here (will be updated) · counts and totals match the file ✓
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn primary" disabled={busy} onClick={() => run(false)}>
              {busy ? "Importing…" : "Import now"}
            </button>
            <button className="btn" onClick={() => (setPreview(null), setJson(null), setFileName(""))}>
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
