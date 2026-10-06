"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { fmtDate, numFmt } from "@/lib/format";
import { completeReminder, deleteReminder, saveReminder } from "@/server/actions";
import type { ReminderView } from "@/server/reminders";
import { Field, IconButton, Modal, StatusChip, useConfirm, useOpenOnAdd, useToast } from "./ui";

const TYPES = ["Oil Change", "Tire Rotation", "Seasonal Tires", "Fluid Service", "Inspection", "Registration", "Insurance", "Custom"];
type Raw = { title: string; type: string | null; dueDate: string | null; dueOdometer: number | null };

export function RemindersView({
  vehicleId,
  list,
  raw,
  prefs,
}: {
  vehicleId: string;
  list: ReminderView[];
  raw: Record<string, Raw>;
  prefs: { leadDays: number; leadKm: number };
}) {
  const [editing, setEditing] = useState<{ id: string | null; r: Partial<Raw> } | null>(null);
  useOpenOnAdd(() => setEditing({ id: null, r: {} }));
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();

  const groups = { overdue: [] as ReminderView[], soon: [] as ReminderView[], upcoming: [] as ReminderView[] };
  list.forEach((r) => groups[r.status].push(r));

  async function submit(data: Record<string, FormDataEntryValue>) {
    setBusy(true);
    const res = await saveReminder(vehicleId, editing?.id ?? null, data);
    setBusy(false);
    if (!res.ok) return toast("error" in res ? res.error : "Couldn't save.", true);
    toast(editing?.id ? "Reminder updated." : "Reminder added.");
    setEditing(null);
    router.refresh();
  }

  return (
    <>
      <div className="toolbar">
        <p className="grow muted" style={{ margin: 0, fontSize: 13 }}>
          Due soon = within {prefs.leadDays} days or {prefs.leadKm.toLocaleString("en-CA")} km (<Link href="/app/account#reminders">change</Link>). Renewal dates come from the Vehicle tab; next-service dates from maintenance records.
        </p>
        <button className="btn primary" onClick={() => setEditing({ id: null, r: {} })}>
          + Add reminder
        </button>
      </div>
      {(
        [
          ["overdue", "Overdue"],
          ["soon", "Due soon"],
          ["upcoming", "Upcoming"],
        ] as const
      ).map(([key, label]) => (
        <section key={key}>
          <h3 className="section-title">
            {label} ({groups[key].length})
          </h3>
          <div className="card">
            {groups[key].length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                Nothing here.
              </p>
            ) : (
              <div className="list">
                {groups[key].map((r) => (
                  <div className="list-item" key={r.id}>
                    <div className="l-main">
                      <div className="l-title">
                        {r.title}
                        {r.virtual ? <span className="muted"> (from vehicle profile / costs)</span> : null}
                      </div>
                      <div className="l-sub">
                        {[r.dueDate ? fmtDate(r.dueDate) : null, r.dueOdometer != null ? `${numFmt(r.dueOdometer)} km` : null].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <StatusChip status={r.status} />
                      {!r.virtual && (
                        <>
                          <button
                            className="btn sm ghost"
                            onClick={async () => {
                              await completeReminder(r.id);
                              toast("Marked done.");
                              router.refresh();
                            }}
                          >
                            Done
                          </button>
                          <IconButton kind="edit" onClick={() => setEditing({ id: r.id, r: raw[r.id] })} />
                          <IconButton
                            kind="trash"
                            onClick={async () => {
                              if (!(await confirm({ title: "Delete reminder?", message: `This removes “${r.title}”.`, confirmLabel: "Delete", danger: true }))) return;
                              await deleteReminder(r.id);
                              toast("Reminder deleted.");
                              router.refresh();
                            }}
                          />
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      ))}

      <Modal
        open={!!editing}
        title={editing?.id ? "Edit reminder" : "Add reminder"}
        onClose={() => setEditing(null)}
        footer={
          <>
            <button className="btn" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button className="btn primary" disabled={busy} onClick={() => formRef.current?.requestSubmit()}>
              Save
            </button>
          </>
        }
      >
        <form
          ref={formRef}
          onSubmit={(e) => {
            e.preventDefault();
            submit(Object.fromEntries(new FormData(e.currentTarget)));
          }}
        >
          <Field label="Title" htmlFor="r-title">
            <input className="input" id="r-title" name="title" required defaultValue={editing?.r.title ?? ""} placeholder="e.g. Rotate tires" />
          </Field>
          <Field label="Type" htmlFor="r-type">
            <select className="select" id="r-type" name="type" defaultValue={editing?.r.type ?? "Custom"}>
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <div className="row2">
            <Field label="Due date" htmlFor="r-date">
              <input className="input" id="r-date" name="dueDate" type="date" defaultValue={editing?.r.dueDate ?? ""} />
            </Field>
            <Field label="Due odometer (km)" htmlFor="r-odo">
              <input className="input" id="r-odo" name="dueOdometer" type="number" min={0} defaultValue={editing?.r.dueOdometer ?? ""} />
            </Field>
          </div>
          <p className="muted" style={{ fontSize: 12 }}>
            Set a date, an odometer reading, or both — whichever comes first shows as due.
          </p>
          <button type="submit" hidden />
        </form>
      </Modal>
    </>
  );
}
