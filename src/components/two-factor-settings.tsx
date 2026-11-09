"use client";

import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { Field, Modal, useToast } from "./ui";

type Step = null | "password" | "scan" | "codes" | "regen" | "disable";

/** Account → Security: turn two-step verification on/off and manage backup codes. */
export function TwoFactorSettings({ enabled, email }: { enabled: boolean; email: string }) {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState<Step>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [understood, setUnderstood] = useState(false);

  function close() {
    setStep(null);
    setError(null);
    setQr(null);
    setSecret(null);
    setSaved(false);
    setUnderstood(false);
    if (codes.length) router.refresh();
    setCodes([]);
  }

  /** Step 1: confirm the password, get the authenticator secret + backup codes. */
  async function start(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data, error } = await authClient.twoFactor.enable({ password: String(new FormData(e.currentTarget).get("password")) });
    setBusy(false);
    if (error || !data) return setError(error?.message ?? "Couldn't start setup.");
    if (!("totpURI" in data)) return setError("Couldn't start authenticator setup. Please try again.");
    setCodes(data.backupCodes);
    setSecret(new URL(data.totpURI).searchParams.get("secret"));
    setQr(await QRCode.toDataURL(data.totpURI, { margin: 1, width: 220 }));
    setStep("scan");
  }

  /** Step 2: prove the app is set up by entering its current code. Only then is 2FA switched on. */
  async function verify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const code = String(new FormData(e.currentTarget).get("code")).replace(/\s/g, "");
    const { error } = await authClient.twoFactor.verifyTotp({ code });
    setBusy(false);
    if (error) return setError("That code didn't match. Use the code showing in the app right now (they change every 30 seconds).");
    setStep("codes");
  }

  async function regenerate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data, error } = await authClient.twoFactor.generateBackupCodes({ password: String(new FormData(e.currentTarget).get("password")) });
    setBusy(false);
    if (error || !data) return setError(error?.message ?? "Couldn't make new codes.");
    setCodes(data.backupCodes);
    setStep("codes");
  }

  async function disable(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await authClient.twoFactor.disable({ password: String(new FormData(e.currentTarget).get("password")) });
    setBusy(false);
    if (error) return setError(error.message ?? "Couldn't turn it off.");
    toast("Two-step verification is off.");
    close();
    router.refresh();
  }

  const codesText = `KeyStub backup codes for ${email}\nEach code works once. Keep them somewhere safe.\n\n${codes.join("\n")}\n`;

  return (
    <>
      <h3 className="section-title" id="security">
        Two-step verification
      </h3>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ maxWidth: 480 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
              <b>Authenticator app</b>
              <span className={`chip ${enabled ? "good" : "neutral"}`}>
                <span className="dot" />
                {enabled ? "On" : "Off"}
              </span>
            </div>
            <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
              {enabled
                ? "Signing in asks for your password and a 6-digit code from your authenticator app."
                : "Add a second step to signing in: a 6-digit code from an app like Google Authenticator, Microsoft Authenticator or 1Password. Even if someone gets your password, they can't get in."}
            </p>
          </div>
          {enabled ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn" onClick={() => setStep("regen")}>
                New backup codes
              </button>
              <button className="btn danger" onClick={() => setStep("disable")}>
                Turn off…
              </button>
            </div>
          ) : (
            <button className="btn primary" onClick={() => setStep("password")}>
              Turn on
            </button>
          )}
        </div>
      </div>

      {/* Setup: password → scan → backup codes */}
      <Modal open={step === "password" || step === "regen"} title={step === "regen" ? "New backup codes" : "Turn on two-step verification"} onClose={close}>
        <form onSubmit={step === "regen" ? regenerate : start}>
          {error && <div className="note error">{error}</div>}
          <p style={{ marginTop: 0 }}>
            {step === "regen"
              ? "This replaces your current backup codes; the old ones stop working. Confirm your password to continue."
              : "You'll need an authenticator app on your phone (Google Authenticator, Microsoft Authenticator, 1Password, Authy…). Confirm your password to start."}
          </p>
          <Field label="Your password" htmlFor="tfa-pw">
            <input className="input" id="tfa-pw" name="password" type="password" required autoComplete="current-password" autoFocus />
          </Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" className="btn" onClick={close}>
              Cancel
            </button>
            <button className="btn primary" disabled={busy}>
              {busy ? "Checking…" : "Continue"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={step === "scan"} title="Scan this code with your authenticator app" onClose={close}>
        <form onSubmit={verify}>
          {error && <div className="note error">{error}</div>}
          <ol className="tfa-steps">
            <li>Open your authenticator app and tap “Add” or “+”.</li>
            <li>Scan this QR code{secret ? ", or type the setup key below" : ""}.</li>
            <li>Enter the 6-digit code the app shows.</li>
          </ol>
          {qr && (
            // eslint-disable-next-line @next/next/no-img-element -- a generated data: URL, not a static asset
            <img src={qr} alt="QR code for your authenticator app" width={180} height={180} className="tfa-qr" />
          )}
          {secret && (
            <p className="tfa-secret">
              Setup key: <code>{secret.match(/.{1,4}/g)?.join(" ")}</code>
            </p>
          )}
          <Field label="6-digit code" htmlFor="tfa-code">
            <input
              className="input tfa-code"
              id="tfa-code"
              name="code"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]{6,7}"
              maxLength={7}
              placeholder="123 456"
            />
          </Field>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" className="btn" onClick={close}>
              Cancel
            </button>
            <button className="btn primary" disabled={busy}>
              {busy ? "Checking…" : "Verify and turn on"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={step === "codes"}
        title={enabled ? "Your new backup codes" : "Two-step verification is on. Save your backup codes"}
        onClose={() => saved && close()}
        footer={
          <button className="btn primary" disabled={!saved} onClick={close}>
            Done
          </button>
        }
      >
        <p style={{ marginTop: 0 }}>
          If you lose your phone, each of these codes lets you sign in <b>once</b>. Store them somewhere safe, like your password manager. They won&apos;t be
          shown again.
        </p>
        <div className="tfa-codes tabular">
          {codes.map((c) => (
            <code key={c}>{c}</code>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
          <button
            type="button"
            className="btn sm"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(codesText);
                toast("Backup codes copied.");
              } catch {
                toast("Couldn't copy. Select the codes and copy them instead.", true);
              }
            }}
          >
            Copy
          </button>
          <a className="btn sm" download="keystub-backup-codes.txt" href={`data:text/plain;charset=utf-8,${encodeURIComponent(codesText)}`}>
            Download .txt
          </a>
        </div>
        <label className="confirm-check">
          <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
          <span>I&apos;ve saved these backup codes somewhere safe.</span>
        </label>
      </Modal>

      <Modal open={step === "disable"} title="Turn off two-step verification?" onClose={close}>
        <form onSubmit={disable}>
          {error && <div className="note error">{error}</div>}
          <p style={{ marginTop: 0 }}>
            Signing in will only need your password again, and your backup codes will stop working. Your account will be easier to break into if your
            password is ever leaked.
          </p>
          <Field label="Your password" htmlFor="tfa-off-pw">
            <input className="input" id="tfa-off-pw" name="password" type="password" required autoComplete="current-password" />
          </Field>
          <label className="confirm-check" style={{ marginBottom: 12 }}>
            <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />
            <span>I understand my account will be protected by my password only.</span>
          </label>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" className="btn" onClick={close}>
              Cancel
            </button>
            <button className="btn danger" disabled={busy || !understood}>
              {busy ? "Turning off…" : "Turn off"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
