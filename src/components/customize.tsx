"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DASH_CARDS, DASH_TILES, HISTORY_OPTIONS, REPORT_CATS, type DashPrefs, type HistoryOption, type Item } from "@/lib/prefs";
import { savePrefs } from "@/server/actions";
import { useToast } from "./ui";

function useSave() {
  const toast = useToast();
  const router = useRouter();
  return async (section: "dashboard" | "reports" | "history", value: unknown, msg: string) => {
    const res = await savePrefs(section, value);
    if (!res.ok) return toast("error" in res ? res.error : "Couldn't save.", true);
    toast(msg);
    router.refresh();
  };
}

function OrderList<T extends string>({
  items,
  setItems,
  meta,
}: {
  items: Item<T>[];
  setItems: (v: Item<T>[]) => void;
  meta: readonly { id: T; label: string; hint?: string }[];
}) {
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
  };
  return (
    <div className="order-list">
      {items.map((it, i) => {
        const m = meta.find((x) => x.id === it.id)!;
        return (
          <div key={it.id} className={`order-row${it.on ? "" : " off"}`}>
            <label className="order-check">
              <input type="checkbox" checked={it.on} onChange={(e) => setItems(items.map((x) => (x.id === it.id ? { ...x, on: e.target.checked } : x)))} />
              <span>
                <b>{m.label}</b>
                {m.hint && <span className="muted"> · {m.hint}</span>}
              </span>
            </label>
            <span className="order-btns">
              <button type="button" className="btn sm ghost" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${m.label} up`}>
                ↑
              </button>
              <button type="button" className="btn sm ghost" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label={`Move ${m.label} down`}>
                ↓
              </button>
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Account → Home screen: show/hide and reorder dashboard tiles and cards. */
export function HomeScreenSettings({ prefs }: { prefs: DashPrefs }) {
  const save = useSave();
  const [tiles, setTiles] = useState(prefs.tiles);
  const [cards, setCards] = useState(prefs.cards);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify({ tiles, cards }) !== JSON.stringify(prefs);
  return (
    <>
      <h3 className="section-title" style={{ marginTop: 0 }}>
        Numbers along the top
      </h3>
      <div className="card">
        <OrderList items={tiles} setItems={setTiles} meta={DASH_TILES} />
      </div>
      <h3 className="section-title">Cards</h3>
      <div className="card">
        <OrderList items={cards} setItems={setCards} meta={DASH_CARDS} />
        <p className="muted" style={{ fontSize: 12.5, margin: "10px 0 0" }}>
          On a computer, cards fill two columns, left to right. On a phone they stack in this order.
        </p>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        <button
          className="btn primary"
          disabled={!dirty || busy}
          onClick={async () => {
            setBusy(true);
            await save("dashboard", { tiles, cards }, "Home screen saved.");
            setBusy(false);
          }}
        >
          {busy ? "Saving…" : "Save layout"}
        </button>
        <button
          className="btn ghost"
          onClick={async () => {
            await save("dashboard", null, "Home screen reset to the default layout.");
            location.reload();
          }}
        >
          Reset to default
        </button>
      </div>
    </>
  );
}

/** Maintenance history: which columns to include (remembered). */
export function HistoryOptions({ show }: { show: HistoryOption[] }) {
  const save = useSave();
  const [sel, setSel] = useState(show);
  const [busy, setBusy] = useState(false);
  return (
    <div className="card no-print history-opts">
      <b style={{ fontSize: 14 }}>Include</b>
      <div className="history-opts-grid">
        {HISTORY_OPTIONS.map((o) => (
          <label key={o.id} className="check-line compact" title={"hint" in o ? o.hint : undefined}>
            <input type="checkbox" checked={sel.includes(o.id)} onChange={(e) => setSel(e.target.checked ? [...sel, o.id] : sel.filter((x) => x !== o.id))} />
            {o.label}
          </label>
        ))}
      </div>
      <button
        className="btn sm"
        disabled={busy || JSON.stringify([...sel].sort()) === JSON.stringify([...show].sort())}
        onClick={async () => {
          setBusy(true);
          await save("history", { show: sel }, "Updated.");
          setBusy(false);
        }}
      >
        {busy ? "Updating…" : "Update report"}
      </button>
    </div>
  );
}

/** Account → Your data and Reports: download a spreadsheet with filters. */
export function ExportOptions({ vehicles, defaultVehicle }: { vehicles: { id: string; name: string }[]; defaultVehicle?: string }) {
  const [vehicle, setVehicle] = useState(defaultVehicle ?? "all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [cats, setCats] = useState<string[]>([...REPORT_CATS]);
  const q = new URLSearchParams({ format: "csv" });
  if (vehicle !== "all") q.set("vehicle", vehicle);
  if (from) q.set("from", from);
  if (to) q.set("to", to);
  if (cats.length < REPORT_CATS.length) q.set("cats", cats.join(","));
  return (
    <div className="export-opts">
      <div className="row3">
        <div className="field">
          <label htmlFor="ex-veh">Vehicle</label>
          <select className="select" id="ex-veh" value={vehicle} onChange={(e) => setVehicle(e.target.value)}>
            <option value="all">All vehicles</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="ex-from">From</label>
          <input className="input" id="ex-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="ex-to">To</label>
          <input className="input" id="ex-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <span className="label">Categories</span>
        <div className="seg-choice">
          {REPORT_CATS.map((c) => (
            <label key={c} className={cats.includes(c) ? "on" : ""}>
              <input type="checkbox" checked={cats.includes(c)} onChange={(e) => setCats(e.target.checked ? [...cats, c] : cats.filter((x) => x !== c))} />
              {c === "Insurance" ? "Insurance" : c === "Other" ? "Registration & other" : c}
            </label>
          ))}
        </div>
      </div>
      <a className={`btn primary${cats.length ? "" : " disabled"}`} href={cats.length ? `/api/export?${q}` : undefined} aria-disabled={!cats.length}>
        Download spreadsheet (CSV)
      </a>
    </div>
  );
}
