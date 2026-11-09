"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteVehicle, setVehicleArchived } from "@/server/actions";
import { Modal, useConfirm, useToast } from "./ui";

type Counts = { fuel: number; charging: number; maintenance: number; costs: number; reminders: number; battery: number };

/** "Restore" for an archived vehicle (garage list and the archived-vehicle banner). */
export function RestoreVehicleButton({ id, className = "btn sm" }: { id: string; className?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={className}
      disabled={busy}
      onClick={async (e) => {
        e.preventDefault();
        setBusy(true);
        const res = await setVehicleArchived(id, false);
        setBusy(false);
        if (!res.ok) return toast("error" in res ? res.error : "Couldn't restore it.", true);
        toast("Vehicle restored to your garage.");
        router.push(`/app/v/${id}`);
        router.refresh();
      }}
    >
      {busy ? "Restoring…" : "Restore"}
    </button>
  );
}

export function VehicleDangerZone({ id, name, archived, counts }: { id: string; name: string; archived: boolean; counts: Counts }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();

  const parts = [
    [counts.fuel, "fill-up"],
    [counts.charging, "charging session"],
    [counts.maintenance, "maintenance record"],
    [counts.costs, "insurance, registration or other cost"],
    [counts.battery, "battery check"],
    [counts.reminders, "reminder"],
  ]
    .filter(([n]) => (n as number) > 0)
    .map(([n, label]) => `${n} ${label}${n === 1 ? "" : "s"}`);
  const total = counts.fuel + counts.charging + counts.maintenance + counts.costs + counts.battery + counts.reminders;

  async function archive() {
    const ok = await confirm({
      title: `Archive ${name}?`,
      message: (
        <>
          <p style={{ marginTop: 0 }}>
            It will be hidden from your garage and Home, but <b>every record is kept</b>. It won&apos;t count toward your plan&apos;s vehicle limit while
            archived.
          </p>
          <p style={{ marginBottom: 0 }}>
            You&apos;ll find it at the bottom of your <b>Garage</b> under <b>Archived vehicles</b>, where you can open it or restore it any time.
          </p>
        </>
      ),
      confirmLabel: "Archive vehicle",
    });
    if (!ok) return;
    const res = await setVehicleArchived(id, true);
    if (!res.ok) return toast("error" in res ? res.error : "Couldn't archive it.", true);
    toast("Vehicle archived. Find it under Garage → Archived vehicles.");
    router.push("/app?garage=1");
    router.refresh();
  }

  function close() {
    setOpen(false);
    setTyped("");
    setUnderstood(false);
  }

  return (
    <>
      <h3 className="section-title">Sold it or no longer driving it?</h3>
      <div className="card" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <p className="muted grow" style={{ margin: 0, fontSize: 13, flex: 1, minWidth: 240 }}>
          {archived
            ? "This vehicle is archived: hidden from your garage, with every record kept. Restore it to start tracking again."
            : "Archiving hides the vehicle from your garage but keeps every record. Deleting removes it and its records permanently."}
        </p>
        {archived ? <RestoreVehicleButton id={id} className="btn" /> : <button className="btn" onClick={archive}>Archive…</button>}
        <button className="btn danger" onClick={() => setOpen(true)}>
          Delete vehicle…
        </button>
      </div>
      <Modal
        open={open}
        title="Delete this vehicle permanently?"
        onClose={close}
        footer={
          <>
            <button className="btn" onClick={close}>
              Cancel
            </button>
            <button
              className="btn danger"
              disabled={!understood || typed.trim().toUpperCase() !== "DELETE" || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await deleteVehicle(id); // the server sends you to the garage when done
                } catch {
                  setBusy(false);
                  toast("Couldn't delete the vehicle. Nothing was removed.", true);
                }
              }}
            >
              {busy ? "Deleting…" : "Delete permanently"}
            </button>
          </>
        }
      >
        <p style={{ marginTop: 0 }}>
          This permanently deletes <b>{name}</b>
          {total > 0 ? (
            <>
              {" "}
              and <b>{total === 1 ? "its 1 record" : `all ${total} records`}</b> attached to it ({parts.join(", ")}).
            </>
          ) : (
            "."
          )}{" "}
          This can&apos;t be undone.
        </p>
        {!archived && (
          <p className="muted" style={{ fontSize: 13 }}>
            Just sold it? <b>Archive</b> instead to keep its history.
          </p>
        )}
        <p style={{ fontSize: 13 }}>
          Want a copy first? <a href="/api/export?format=json">Download a full backup</a>.
        </p>
        <label className="confirm-check" style={{ marginBottom: 12 }}>
          <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />
          <span>I understand {name} and all of its records will be permanently deleted.</span>
        </label>
        <label htmlFor="confirm-del" style={{ fontSize: 13 }}>
          Type <b>DELETE</b> to confirm:
        </label>
        <input className="input" id="confirm-del" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoCapitalize="characters" />
      </Modal>
    </>
  );
}
