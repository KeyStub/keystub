"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { Field, Modal, useToast } from "./ui";

export function AccountForms({ name, email }: { name: string; email: string }) {
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [typed, setTyped] = useState("");

  async function saveName(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy("name");
    const { error } = await authClient.updateUser({ name: String(new FormData(e.currentTarget).get("name")).trim() });
    setBusy(null);
    if (error) return toast(error.message ?? "Couldn't save.", true);
    toast("Name updated.");
    router.refresh();
  }

  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    if (f.get("newPassword") !== f.get("confirm")) return toast("New passwords don't match.", true);
    setBusy("pw");
    const { error } = await authClient.changePassword({
      currentPassword: String(f.get("currentPassword")),
      newPassword: String(f.get("newPassword")),
      revokeOtherSessions: true,
    });
    setBusy(null);
    if (error) return toast(error.message ?? "Couldn't change password.", true);
    form.reset();
    toast("Password changed. Other devices were signed out.");
  }

  async function deleteAccount(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy("del");
    const { error } = await authClient.deleteUser({ password: String(new FormData(e.currentTarget).get("password")) });
    setBusy(null);
    if (error) return toast(error.message ?? "Couldn't delete account.", true);
    router.push("/?deleted=1");
  }

  return (
    <>
      <h3 className="section-title">Profile</h3>
      <div className="card">
        <form onSubmit={saveName} className="row2" style={{ alignItems: "end" }}>
          <Field label="Name" htmlFor="acc-name">
            <input className="input" id="acc-name" name="name" defaultValue={name} required maxLength={100} />
          </Field>
          <div className="field">
            <button className="btn" disabled={busy === "name"}>
              Save name
            </button>
          </div>
        </form>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          Signed in as <b>{email}</b>
        </p>
      </div>

      <h3 className="section-title">Password</h3>
      <form className="card" onSubmit={changePassword}>
        <Field label="Current password" htmlFor="pw-cur">
          <input className="input" id="pw-cur" name="currentPassword" type="password" required autoComplete="current-password" />
        </Field>
        <div className="row2">
          <Field label="New password" htmlFor="pw-new">
            <input className="input" id="pw-new" name="newPassword" type="password" required minLength={10} autoComplete="new-password" />
          </Field>
          <Field label="Confirm new password" htmlFor="pw-conf">
            <input className="input" id="pw-conf" name="confirm" type="password" required minLength={10} autoComplete="new-password" />
          </Field>
        </div>
        <button className="btn" disabled={busy === "pw"}>
          Change password
        </button>
      </form>

      <h3 className="section-title">Delete account</h3>
      <div className="card" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <p className="muted" style={{ margin: 0, fontSize: 13, maxWidth: 480 }}>
          Permanently deletes your account, every vehicle and every record. Download a backup first — this can&apos;t be undone.
        </p>
        <button className="btn danger" onClick={() => setDeleteOpen(true)}>
          Delete account…
        </button>
      </div>
      <Modal open={deleteOpen} title="Delete your account?" onClose={() => setDeleteOpen(false)}>
        <form onSubmit={deleteAccount}>
          <p style={{ marginTop: 0 }}>Everything will be permanently deleted. If you have a paid plan, cancel it under Manage billing first.</p>
          <Field label='Type "delete my account"' htmlFor="del-typed">
            <input className="input" id="del-typed" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </Field>
          <Field label="Your password" htmlFor="del-pw">
            <input className="input" id="del-pw" name="password" type="password" required autoComplete="current-password" />
          </Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" className="btn" onClick={() => setDeleteOpen(false)}>
              Cancel
            </button>
            <button className="btn danger" disabled={typed.trim().toLowerCase() !== "delete my account" || busy === "del"}>
              Delete everything
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
