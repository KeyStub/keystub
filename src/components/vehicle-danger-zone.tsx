"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteVehicle, setVehicleArchived } from "@/server/actions";
import { Modal, useToast } from "./ui";

export function VehicleDangerZone({ id, name, archived }: { id: string; name: string; archived: boolean }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const router = useRouter();
  const toast = useToast();
  return (
    <>
      <h3 className="section-title">Sold it or no longer driving it?</h3>
      <div className="card" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <p className="muted grow" style={{ margin: 0, fontSize: 13, flex: 1, minWidth: 240 }}>
          Archiving hides the vehicle from your garage but keeps every record. Deleting is permanent — download a backup from Account first.
        </p>
        <button
          className="btn"
          onClick={async () => {
            await setVehicleArchived(id, !archived);
            toast(archived ? "Vehicle restored." : "Vehicle archived.");
            router.push(archived ? `/app/v/${id}` : "/app?garage=1");
            router.refresh();
          }}
        >
          {archived ? "Unarchive" : "Archive"}
        </button>
        <button className="btn danger" onClick={() => setOpen(true)}>
          Delete vehicle…
        </button>
      </div>
      <Modal
        open={open}
        title="Delete vehicle and all its records?"
        onClose={() => setOpen(false)}
        footer={
          <>
            <button className="btn" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="btn danger" disabled={typed.trim() !== name} onClick={() => deleteVehicle(id)}>
              Delete permanently
            </button>
          </>
        }
      >
        <p style={{ marginTop: 0 }}>
          This permanently deletes <b>{name}</b> and every fuel, maintenance, cost and reminder record attached to it. It can&apos;t be undone.
        </p>
        <label htmlFor="confirm-name" style={{ fontSize: 13 }}>
          Type <b>{name}</b> to confirm:
        </label>
        <input className="input" id="confirm-name" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
      </Modal>
    </>
  );
}
