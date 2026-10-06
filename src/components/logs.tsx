"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { CHARGE_LOCATIONS } from "@/lib/calc";
import { centsToInput, fmtDate, numFmt, todayISO } from "@/lib/format";
import {
  clearReviewFlag,
  deleteRecord,
  saveCharge,
  saveCost,
  saveFuel,
  saveMaintenance,
  type ActionResult,
  type RecordKind,
} from "@/server/actions";
import type { ChargingSession, CostRecord, FuelEntry, MaintenanceRecord } from "@/server/data";
import { Field, IconButton, Modal, useConfirm, useOpenOnAdd, useToast } from "./ui";
import { useFmt } from "./units-provider";

export const FUEL_GRADES = ["Regular", "Mid-grade", "Premium", "Diesel", "E85"];
export const MAINT_CATEGORIES = [
  "Oil Change",
  "Tires",
  "Brakes",
  "Battery",
  "12V battery",
  "Fluids",
  "Cabin / air filter",
  "Inspection",
  "Repair",
  "Service",
  "Software / recall",
  "Car Wash",
  "Other",
];
export const COST_TYPES = [
  "Insurance",
  "Registration",
  "License & Registry",
  "Parking",
  "Tolls",
  "Roadside Assistance",
  "Subscription",
  "Seasonal Tires",
  "Financing",
  "Home charger",
  "Charging subscription",
  "Rebate / incentive",
  "Other",
];

/* ---------------- shared save flow: warnings → confirm → re-submit ---------------- */

function useSaver() {
  const confirm = useConfirm();
  const toast = useToast();
  const router = useRouter();
  return async (run: (acknowledged: boolean) => Promise<ActionResult>, okMsg: string) => {
    let res = await run(false);
    if (!res.ok && "warnings" in res) {
      const go = await confirm({
        title: "Double-check this entry",
        message: (
          <>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {res.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <p style={{ marginBottom: 0 }}>Save it anyway?</p>
          </>
        ),
        confirmLabel: "Save anyway",
      });
      if (!go) return false;
      res = await run(true);
    }
    if (!res.ok) {
      toast("error" in res ? res.error : "Couldn't save.", true);
      return false;
    }
    toast(okMsg);
    router.refresh();
    return true;
  };
}

/* ------------------------------ generic log table ------------------------------ */

type Column<T> = { label: string; num?: boolean; hideSm?: boolean; render: (r: T) => ReactNode };

function LogTable<T extends { id: string; date: string; reviewFlag: string | null; legacy: boolean }>({
  kind,
  singular,
  rows,
  amount,
  columns,
  searchText,
  filterOptions,
  rowType,
  onOpen,
}: {
  kind: RecordKind;
  singular: string;
  rows: T[];
  amount: (r: T) => number;
  columns: Column<T>[];
  searchText: (r: T) => string;
  filterOptions?: string[];
  rowType?: (r: T) => string | null;
  onOpen: (r: T | null) => void;
}) {
  const u = useFmt();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const confirm = useConfirm();
  const toast = useToast();
  const router = useRouter();
  const flaggedCount = rows.filter((r) => r.reviewFlag).length;

  const shown = useMemo(() => {
    let out = rows;
    if (filter !== "all" && rowType) out = out.filter((r) => rowType(r) === filter);
    if (flaggedOnly) out = out.filter((r) => r.reviewFlag);
    const s = q.trim().toLowerCase();
    if (s) out = out.filter((r) => searchText(r).toLowerCase().includes(s));
    return out;
  }, [rows, filter, flaggedOnly, q, rowType, searchText]);
  const total = shown.reduce((s, r) => s + amount(r), 0);

  async function remove(r: T) {
    const ok = await confirm({
      title: `Delete ${singular}?`,
      message: `This permanently deletes the record dated ${fmtDate(r.date)} for ${u.money(amount(r))}. This can't be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    const res = await deleteRecord(kind, r.id);
    if (!res.ok) return toast("error" in res ? res.error : "Couldn't delete.", true);
    toast(`${singular[0].toUpperCase() + singular.slice(1)} deleted.`);
    router.refresh();
  }

  return (
    <>
      <div className="toolbar">
        <div className="grow">
          <input className="input" placeholder="Search…" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {filterOptions && (
          <select className="select inline" aria-label="Filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All types</option>
            {filterOptions.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        )}
        {flaggedCount > 0 && (
          <button className={`btn ${flaggedOnly ? "primary" : ""}`} onClick={() => setFlaggedOnly((x) => !x)}>
            ⚑ Needs review ({flaggedCount})
          </button>
        )}
        <button className="btn primary" onClick={() => onOpen(null)}>
          + Add {singular}
        </button>
      </div>
      <div className="card" style={{ marginBottom: 14, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <span className="muted">
          {shown.length} record{shown.length === 1 ? "" : "s"}
        </span>
        <span style={{ fontWeight: 700, fontSize: 15 }} className="tabular">
          Total: {u.money(total)}
        </span>
      </div>
      <div className="card table-wrap">
        <table className="data">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.label} className={`${c.num ? "num" : ""}${c.hideSm ? " hide-sm" : ""}`}>
                  {c.label}
                </th>
              ))}
              <th className="num">Actions</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr className="empty-row">
                <td colSpan={columns.length + 1}>No records{rows.length ? " match" : ` yet. Click “+ Add ${singular}” to log your first one`}.</td>
              </tr>
            ) : (
              shown.map((r) => (
                <tr
                  key={r.id}
                  className="row-btn"
                  tabIndex={0}
                  onClick={() => onOpen(r)}
                  onKeyDown={(e) => e.key === "Enter" && onOpen(r)}
                >
                  {columns.map((c, i) => (
                    <td key={c.label} className={`${c.num ? "num tabular" : ""}${c.hideSm ? " hide-sm" : ""}`}>
                      {i === 0 && r.reviewFlag && (
                        <span className="chip warning" title={r.reviewFlag} style={{ marginRight: 6 }}>
                          ⚑
                        </span>
                      )}
                      {c.render(r)}
                    </td>
                  ))}
                  <td className="num" style={{ whiteSpace: "nowrap" }}>
                    <IconButton kind="edit" onClick={() => onOpen(r)} />
                    <IconButton kind="trash" onClick={() => remove(r)} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ReviewNote({ kind, r, onCleared }: { kind: RecordKind; r: { id: string; reviewFlag: string | null }; onCleared: () => void }) {
  const toast = useToast();
  const router = useRouter();
  if (!r.reviewFlag) return null;
  return (
    <div className="note">
      <b>Needs review:</b> {r.reviewFlag}
      <div style={{ marginTop: 8 }}>
        <button
          type="button"
          className="btn sm"
          onClick={async () => {
            const res = await clearReviewFlag(kind, r.id);
            if (!res.ok) return toast("Couldn't update.", true);
            toast("Marked as reviewed.");
            router.refresh();
            onCleared();
          }}
        >
          It&apos;s correct — clear flag
        </button>
      </div>
    </div>
  );
}

function FormModal({
  title,
  open,
  onClose,
  onSubmit,
  children,
  busy,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, FormDataEntryValue>) => void;
  children: ReactNode;
  busy: boolean;
}) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={busy} onClick={() => ref.current?.requestSubmit()}>
            {busy ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <form
        ref={ref}
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          onSubmit(Object.fromEntries(new FormData(e.currentTarget)));
        }}
      >
        {children}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

/* ===================================== FUEL ===================================== */

export function FuelLog({ vehicleId, rows }: { vehicleId: string; rows: FuelEntry[] }) {
  const [editing, setEditing] = useState<FuelEntry | null | undefined>(undefined);
  useOpenOnAdd(() => setEditing(null));
  const [busy, setBusy] = useState(false);
  const save = useSaver();
  const u = useFmt();
  const totalRef = useRef<HTMLInputElement>(null);
  const totalTouched = useRef(false);
  const ex = editing ?? null;

  function autoTotal(form: HTMLFormElement | null) {
    if (!form || totalTouched.current) return;
    const l = parseFloat((form.elements.namedItem("litres") as HTMLInputElement).value);
    const p = parseFloat((form.elements.namedItem("pricePerLitre") as HTMLInputElement).value);
    if (l > 0 && p > 0 && totalRef.current) totalRef.current.value = (l * p).toFixed(2);
  }

  return (
    <>
      <LogTable
        kind="fuel"
        singular="fuel entry"
        rows={rows}
        amount={(r) => r.totalPaidCents}
        searchText={(r) => [r.station, r.grade, r.notes, r.date].filter(Boolean).join(" ")}
        filterOptions={["Full tank", "Partial fill"]}
        rowType={(r) => (r.fillType === "full" ? "Full tank" : r.fillType === "partial" ? "Partial fill" : null)}
        onOpen={(r) => {
          totalTouched.current = !!r;
          setEditing(r);
        }}
        columns={[
          { label: "Date", render: (r) => fmtDate(r.date) },
          { label: "Odometer", num: true, hideSm: true, render: (r) => u.dist(r.odometer) },
          { label: u.volWord, num: true, hideSm: true, render: (r) => u.vol(r.litres) },
          {
            label: u.perVolLabel,
            num: true,
            hideSm: true,
            render: (r) => {
              const ppl = r.pricePerLitre ?? (r.litres ? r.totalPaidCents / 100 / r.litres : null);
              return ppl != null ? u.price(u.perVolToUser(ppl)!) : "—";
            },
          },
          { label: "Station", render: (r) => r.station || "—" },
          { label: "Total", num: true, render: (r) => u.money(r.totalPaidCents) },
        ]}
      />
      <FormModal
        title={ex ? "Edit fuel entry" : "Add fuel entry"}
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        busy={busy}
        onSubmit={async (data) => {
          setBusy(true);
          const ok = await save((ack) => saveFuel(vehicleId, ex?.id ?? null, data, ack), ex ? "Fuel entry updated." : "Fuel entry added.");
          setBusy(false);
          if (ok) setEditing(undefined);
        }}
      >
        {ex?.legacy && <div className="note info">Migrated from your old tracker — odometer, litres and grade weren&apos;t recorded there.</div>}
        {ex && <ReviewNote kind="fuel" r={ex} onCleared={() => setEditing(undefined)} />}
        <div className="row2">
          <Field label="Date" htmlFor="f-date">
            <input className="input" id="f-date" name="date" type="date" required defaultValue={ex?.date ?? todayISO()} />
          </Field>
          <Field label={`Odometer (${u.distUnit})`} htmlFor="f-odo">
            <input className="input" id="f-odo" name="odometer" type="number" min={0} inputMode="numeric" defaultValue={u.distInput(ex?.odometer)} />
          </Field>
        </div>
        <div className="row3">
          <Field label={u.volWord} htmlFor="f-litres">
            <input
              className="input"
              id="f-litres"
              name="litres"
              type="number"
              step="0.001"
              min={0}
              inputMode="decimal"
              defaultValue={u.volInput(ex?.litres)}
              onInput={(e) => autoTotal(e.currentTarget.form)}
            />
          </Field>
          <Field label={`Price (${u.perVolLabel})`} htmlFor="f-ppl">
            <input
              className="input"
              id="f-ppl"
              name="pricePerLitre"
              type="number"
              step="0.001"
              min={0}
              inputMode="decimal"
              defaultValue={u.perVolInput(ex?.pricePerLitre)}
              onInput={(e) => autoTotal(e.currentTarget.form)}
            />
          </Field>
          <Field label={u.moneyLabel("Total paid")} htmlFor="f-total">
            <input
              ref={totalRef}
              className="input"
              id="f-total"
              name="totalPaid"
              type="number"
              step="0.01"
              min={0.01}
              required
              inputMode="decimal"
              defaultValue={centsToInput(ex?.totalPaidCents)}
              onInput={() => (totalTouched.current = true)}
            />
          </Field>
        </div>
        <div className="row2">
          <Field label="Gas station" htmlFor="f-station">
            <input className="input" id="f-station" name="station" defaultValue={ex?.station ?? ""} placeholder="e.g. Shell on Main St" list="station-list" />
            <datalist id="station-list">
              {[...new Set(rows.map((r) => r.station).filter(Boolean))].map((s) => (
                <option key={s} value={s!} />
              ))}
            </datalist>
          </Field>
          <Field label="Fuel grade" htmlFor="f-grade">
            <select className="select" id="f-grade" name="grade" defaultValue={ex?.grade ?? ""}>
              <option value="">—</option>
              {FUEL_GRADES.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="field">
          <span className="label">Fill type</span>
          <div className="radio-group">
            <label>
              <input type="radio" name="fillType" value="full" defaultChecked={ex ? ex.fillType === "full" : true} /> Full tank
            </label>
            <label>
              <input type="radio" name="fillType" value="partial" defaultChecked={ex?.fillType === "partial"} /> Partial fill
            </label>
          </div>
          <div className="hint">Fuel economy is calculated between full-tank fill-ups.</div>
        </div>
        <Field label="Notes" htmlFor="f-notes">
          <textarea className="input" id="f-notes" name="notes" rows={2} defaultValue={ex?.notes ?? ""} />
        </Field>
      </FormModal>
    </>
  );
}

/* ================================== MAINTENANCE ================================== */

export function MaintenanceLog({ vehicleId, rows }: { vehicleId: string; rows: MaintenanceRecord[] }) {
  const [editing, setEditing] = useState<MaintenanceRecord | null | undefined>(undefined);
  useOpenOnAdd(() => setEditing(null));
  const [busy, setBusy] = useState(false);
  const save = useSaver();
  const u = useFmt();
  const totalRef = useRef<HTMLInputElement>(null);
  const totalTouched = useRef(false);
  const ex = editing ?? null;

  function autoTotal(form: HTMLFormElement | null) {
    if (!form || totalTouched.current || !totalRef.current) return;
    const v = (n: string) => parseFloat((form.elements.namedItem(n) as HTMLInputElement).value) || 0;
    const sum = v("partsCost") + v("labourCost") + v("taxCost");
    if (sum) totalRef.current.value = sum.toFixed(2);
  }

  return (
    <>
      <LogTable
        kind="maintenance"
        singular="maintenance record"
        rows={rows}
        amount={(r) => r.totalCostCents}
        searchText={(r) => [r.description, r.shop, r.category, r.notes, r.receiptRef, r.date].filter(Boolean).join(" ")}
        filterOptions={MAINT_CATEGORIES}
        rowType={(r) => r.category}
        onOpen={(r) => {
          totalTouched.current = !!r;
          setEditing(r);
        }}
        columns={[
          { label: "Date", render: (r) => fmtDate(r.date) },
          { label: "Category", hideSm: true, render: (r) => r.category || "—" },
          { label: "Description", render: (r) => <span style={{ display: "inline-block", maxWidth: 340 }}>{r.description || "—"}</span> },
          { label: "Shop", hideSm: true, render: (r) => r.shop || "—" },
          {
            label: "Next service",
            hideSm: true,
            render: (r) => (r.nextServiceDate ? fmtDate(r.nextServiceDate) : r.nextServiceOdometer != null ? u.dist(r.nextServiceOdometer) : "—"),
          },
          { label: "Total", num: true, render: (r) => u.money(r.totalCostCents) },
        ]}
      />
      <FormModal
        title={ex ? "Edit maintenance record" : "Add maintenance record"}
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        busy={busy}
        onSubmit={async (data) => {
          setBusy(true);
          const ok = await save(
            (ack) => saveMaintenance(vehicleId, ex?.id ?? null, data, ack),
            ex ? "Maintenance record updated." : "Maintenance record added.",
          );
          setBusy(false);
          if (ok) setEditing(undefined);
        }}
      >
        {ex?.legacy && !ex.category && (
          <div className="note info">Migrated from your old tracker — only the date and total were recorded. Fill in the rest whenever you have it.</div>
        )}
        {ex && <ReviewNote kind="maintenance" r={ex} onCleared={() => setEditing(undefined)} />}
        <div className="row2">
          <Field label="Date" htmlFor="m-date">
            <input className="input" id="m-date" name="date" type="date" required defaultValue={ex?.date ?? todayISO()} />
          </Field>
          <Field label={`Odometer (${u.distUnit})`} htmlFor="m-odo">
            <input className="input" id="m-odo" name="odometer" type="number" min={0} defaultValue={u.distInput(ex?.odometer)} />
          </Field>
        </div>
        <div className="row2">
          <Field label="Category" htmlFor="m-cat">
            <select className="select" id="m-cat" name="category" defaultValue={ex?.category ?? "Oil Change"}>
              <option value="">—</option>
              {[...new Set([...MAINT_CATEGORIES, ...(ex?.category ? [ex.category] : [])])].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Shop / provider" htmlFor="m-shop">
            <input className="input" id="m-shop" name="shop" defaultValue={ex?.shop ?? ""} />
          </Field>
        </div>
        <Field label="Description" htmlFor="m-desc">
          <textarea className="input" id="m-desc" name="description" rows={2} defaultValue={ex?.description ?? ""} placeholder="e.g. Full synthetic oil change" />
        </Field>
        <div className="row3">
          {(
            [
              ["partsCost", u.moneyLabel("Parts"), ex?.partsCents],
              ["labourCost", u.moneyLabel("Labour"), ex?.labourCents],
              ["taxCost", u.moneyLabel("Tax"), ex?.taxCents],
            ] as const
          ).map(([name, label, val]) => (
            <Field key={name} label={label} htmlFor={`m-${name}`}>
              <input
                className="input"
                id={`m-${name}`}
                name={name}
                type="number"
                step="0.01"
                min={0}
                defaultValue={centsToInput(val)}
                onInput={(e) => autoTotal(e.currentTarget.form)}
              />
            </Field>
          ))}
        </div>
        <Field label={u.moneyLabel("Total cost")} htmlFor="m-total" hint="Auto-fills from parts + labour + tax; edit it if the invoice included other fees.">
          <input
            ref={totalRef}
            className="input"
            id="m-total"
            name="totalCost"
            type="number"
            step="0.01"
            min={0.01}
            required
            defaultValue={centsToInput(ex?.totalCostCents)}
            onInput={() => (totalTouched.current = true)}
          />
        </Field>
        <div className="row2">
          <Field label="Next service date" htmlFor="m-nd" hint="Creates a reminder.">
            <input className="input" id="m-nd" name="nextServiceDate" type="date" defaultValue={ex?.nextServiceDate ?? ""} />
          </Field>
          <Field label={`Next service odometer (${u.distUnit})`} htmlFor="m-no">
            <input className="input" id="m-no" name="nextServiceOdometer" type="number" min={0} defaultValue={u.distInput(ex?.nextServiceOdometer)} />
          </Field>
        </div>
        <div className="row2">
          <Field label="Receipt / invoice reference" htmlFor="m-rr">
            <input className="input" id="m-rr" name="receiptRef" defaultValue={ex?.receiptRef ?? ""} />
          </Field>
          <Field label="Warranty info" htmlFor="m-w">
            <input className="input" id="m-w" name="warrantyInfo" defaultValue={ex?.warrantyInfo ?? ""} />
          </Field>
        </div>
        <Field label="Notes" htmlFor="m-notes">
          <textarea className="input" id="m-notes" name="notes" rows={3} defaultValue={ex?.notes ?? ""} />
        </Field>
      </FormModal>
    </>
  );
}

/* =============================== RECURRING / OTHER =============================== */

export function CostLog({ vehicleId, rows }: { vehicleId: string; rows: CostRecord[] }) {
  const [editing, setEditing] = useState<CostRecord | null | undefined>(undefined);
  useOpenOnAdd(() => setEditing(null));
  const [busy, setBusy] = useState(false);
  const save = useSaver();
  const u = useFmt();
  const ex = editing ?? null;
  return (
    <>
      <LogTable
        kind="cost"
        singular="record"
        rows={rows}
        amount={(r) => r.amountCents}
        searchText={(r) => [r.type, r.provider, r.notes, r.date].filter(Boolean).join(" ")}
        filterOptions={COST_TYPES}
        rowType={(r) => r.type}
        onOpen={setEditing}
        columns={[
          { label: "Date", render: (r) => fmtDate(r.date) },
          { label: "Type", render: (r) => r.type },
          { label: "Provider", hideSm: true, render: (r) => r.provider || "—" },
          { label: "Next due", hideSm: true, render: (r) => (r.nextDueDate ? fmtDate(r.nextDueDate) : "—") },
          { label: "Amount", num: true, render: (r) => u.money(r.amountCents) },
        ]}
      />
      <FormModal
        title={ex ? "Edit record" : "Add recurring / other cost"}
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        busy={busy}
        onSubmit={async (data) => {
          setBusy(true);
          const ok = await save((ack) => saveCost(vehicleId, ex?.id ?? null, data, ack), ex ? "Record updated." : "Record added.");
          setBusy(false);
          if (ok) setEditing(undefined);
        }}
      >
        {ex && <ReviewNote kind="cost" r={ex} onCleared={() => setEditing(undefined)} />}
        <div className="row2">
          <Field label="Type" htmlFor="c-type">
            <select className="select" id="c-type" name="type" defaultValue={ex?.type ?? "Insurance"}>
              {[...new Set([...COST_TYPES, ...(ex?.type ? [ex.type] : [])])].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Date" htmlFor="c-date">
            <input className="input" id="c-date" name="date" type="date" required defaultValue={ex?.date ?? todayISO()} />
          </Field>
        </div>
        <div className="row2">
          <Field label={u.moneyLabel("Amount")} htmlFor="c-amt">
            <input className="input" id="c-amt" name="amount" type="number" step="0.01" min={0.01} required defaultValue={centsToInput(ex?.amountCents)} />
          </Field>
          <Field label="Provider" htmlFor="c-prov">
            <input className="input" id="c-prov" name="provider" defaultValue={ex?.provider ?? ""} placeholder="e.g. Co-operators" />
          </Field>
        </div>
        <Field label="Next due date (optional)" htmlFor="c-next" hint="For a recurring cost, when it's next due — shows in Reminders.">
          <input className="input" id="c-next" name="nextDueDate" type="date" defaultValue={ex?.nextDueDate ?? ""} />
        </Field>
        <Field label="Notes" htmlFor="c-notes">
          <textarea className="input" id="c-notes" name="notes" rows={2} defaultValue={ex?.notes ?? ""} />
        </Field>
      </FormModal>
    </>
  );
}

/* ===================================== EV CHARGING ===================================== */




export function ChargeLog({ vehicleId, rows, homeKwhPrice }: { vehicleId: string; rows: ChargingSession[]; homeKwhPrice: number }) {
  const [editing, setEditing] = useState<ChargingSession | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [loc, setLoc] = useState("home");
  const save = useSaver();
  const u = useFmt();
  const ex = editing ?? null;
  const open = (r: ChargingSession | null) => {
    setLoc(r?.location ?? "home");
    setEditing(r);
  };
  useOpenOnAdd(() => open(null));

  return (
    <>
      <LogTable
        kind="charge"
        singular="charging session"
        rows={rows}
        amount={(r) => r.costCents}
        searchText={(r) => [r.network, CHARGE_LOCATIONS[r.location], r.notes, r.date].filter(Boolean).join(" ")}
        filterOptions={Object.values(CHARGE_LOCATIONS)}
        rowType={(r) => CHARGE_LOCATIONS[r.location] ?? r.location}
        onOpen={open}
        columns={[
          { label: "Date", render: (r) => fmtDate(r.date) },
          { label: "Where", render: (r) => r.network || CHARGE_LOCATIONS[r.location] || r.location },
          { label: "kWh", num: true, render: (r) => numFmt(r.kwh, 1) },
          { label: "Battery", num: true, hideSm: true, render: (r) => (r.startPct != null && r.endPct != null ? `${r.startPct}→${r.endPct}%` : "—") },
          { label: `${u.symbol}/kWh`, num: true, hideSm: true, render: (r) => (r.pricePerKwh != null ? u.price(r.pricePerKwh) : "—") },
          { label: "Odometer", num: true, hideSm: true, render: (r) => u.dist(r.odometer) },
          {
            label: "Cost",
            num: true,
            render: (r) => (
              <span title={r.costEstimated ? "Estimated from your home electricity rate" : undefined}>
                {r.costCents === 0 ? "Free" : u.money(r.costCents)}
                {r.costEstimated ? "*" : ""}
              </span>
            ),
          },
        ]}
      />
      {rows.some((r) => r.costEstimated) && (
        <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
          * Estimated from your home electricity rate ({u.price(homeKwhPrice)}/kWh). Change it under Account → Energy.
        </p>
      )}
      <FormModal
        title={ex ? "Edit charging session" : "Log a charge"}
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        busy={busy}
        onSubmit={async (data) => {
          setBusy(true);
          const ok = await save((ack) => saveCharge(vehicleId, ex?.id ?? null, data, ack), ex ? "Charging session updated." : "Charge logged.");
          setBusy(false);
          if (ok) setEditing(undefined);
        }}
      >
        <div className="row2">
          <Field label="Date" htmlFor="ch-date">
            <input className="input" id="ch-date" name="date" type="date" required defaultValue={ex?.date ?? todayISO()} />
          </Field>
          <Field label="Where" htmlFor="ch-loc">
            <select className="select" id="ch-loc" name="location" value={loc} onChange={(e) => setLoc(e.target.value)}>
              {Object.entries(CHARGE_LOCATIONS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="row2">
          <Field label="Energy added (kWh)" htmlFor="ch-kwh" hint="From the charger, app or car.">
            <input className="input" id="ch-kwh" name="kwh" type="number" step="0.01" min={0.01} required inputMode="decimal" defaultValue={ex?.kwh ?? ""} />
          </Field>
          <Field
            label={u.moneyLabel("Cost")}
            htmlFor="ch-cost"
            hint={loc === "home" ? `Leave blank to estimate at ${u.price(homeKwhPrice)}/kWh. Enter 0 if free.` : "Enter 0 if it was free."}
          >
            <input
              className="input"
              id="ch-cost"
              name="cost"
              type="number"
              step="0.01"
              min={0}
              inputMode="decimal"
              required={loc !== "home"}
              defaultValue={ex && !ex.costEstimated ? centsToInput(ex.costCents) : ""}
            />
          </Field>
        </div>
        {loc !== "home" && (
          <Field label="Network or station (optional)" htmlFor="ch-net">
            <input className="input" id="ch-net" name="network" defaultValue={ex?.network ?? ""} placeholder="e.g. FLO, Electrify Canada, Tesla Supercharger" list="network-list" />
            <datalist id="network-list">
              {[...new Set(rows.map((r) => r.network).filter(Boolean))].map((n) => (
                <option key={n} value={n!} />
              ))}
            </datalist>
          </Field>
        )}
        <div className="row3">
          <Field label="Battery start %" htmlFor="ch-s">
            <input className="input" id="ch-s" name="startPct" type="number" min={0} max={100} defaultValue={ex?.startPct ?? ""} />
          </Field>
          <Field label="Battery end %" htmlFor="ch-e">
            <input className="input" id="ch-e" name="endPct" type="number" min={0} max={100} defaultValue={ex?.endPct ?? ""} />
          </Field>
          <Field label="Minutes" htmlFor="ch-m">
            <input className="input" id="ch-m" name="minutes" type="number" min={0} defaultValue={ex?.minutes ?? ""} />
          </Field>
        </div>
        <Field label={`Odometer (${u.distUnit})`} htmlFor="ch-odo" hint={`Add it now and then: it's how efficiency (${u.evEffUnit}) is worked out.`}>
          <input className="input" id="ch-odo" name="odometer" type="number" min={0} inputMode="numeric" defaultValue={u.distInput(ex?.odometer)} />
        </Field>
        <Field label="Notes" htmlFor="ch-notes">
          <textarea className="input" id="ch-notes" name="notes" rows={2} defaultValue={ex?.notes ?? ""} />
        </Field>
      </FormModal>
    </>
  );
}
