"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { adminUrl } from "@/lib/admin";
import { authClient } from "@/lib/auth-client";
import { isInvitedStaff } from "@/server/actions";

function useSubmit() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  return { busy, setBusy, error, setError, info, setInfo };
}

export function SignUpForm({ staff = false }: { staff?: boolean }) {
  const s = useSubmit();
  const [done, setDone] = useState(false);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password"));
    if (password !== String(f.get("confirm"))) return s.setError("Passwords don't match.");
    s.setBusy(true);
    s.setError(null);
    if (staff && !(await isInvitedStaff(f.get("email")))) {
      s.setBusy(false);
      return s.setError("That email isn't on the KeyStub staff list. Use the work email you were invited with, or ask an owner to add you. To use KeyStub for your own vehicles, sign up at keystub.com.");
    }
    const { error } = await authClient.signUp.email({
      name: String(f.get("name")).trim(),
      email: String(f.get("email")).trim(),
      password,
      callbackURL: staff ? adminUrl("/admin") : "/app",
    });
    s.setBusy(false);
    if (error) return s.setError(error.message ?? "Couldn't create your account.");
    setDone(true);
  }
  if (done)
    return (
      <div className="note info">
        {staff
          ? "Check your work inbox: we sent a link to confirm your email. Once confirmed, sign in here and set up two-step verification."
          : "Check your inbox — we sent a link to confirm your email. Once confirmed you'll be signed in automatically."}
      </div>
    );
  return (
    <form onSubmit={onSubmit}>
      {s.error && <div className="note error">{s.error}</div>}
      <div className="field">
        <label htmlFor="name">Name</label>
        <input className="input" id="name" name="name" required autoComplete="name" maxLength={100} />
      </div>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input className="input" id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input className="input" id="password" name="password" type="password" required minLength={10} autoComplete="new-password" />
        <div className="hint">At least 10 characters. Passwords found in known data breaches are rejected.</div>
      </div>
      <div className="field">
        <label htmlFor="confirm">Confirm password</label>
        <input className="input" id="confirm" name="confirm" type="password" required minLength={10} autoComplete="new-password" />
      </div>
      <p className="muted" style={{ fontSize: 12.5 }}>
        By creating an account you agree to the <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.
      </p>
      <button className="btn primary block" disabled={s.busy}>
        {s.busy ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}

export function SignInForm({ home = "/app" }: { home?: string }) {
  const s = useSubmit();
  const router = useRouter();
  const params = useSearchParams();
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email")).trim();
    s.setBusy(true);
    s.setError(null);
    setUnverifiedEmail(null);
    const { data, error } = await authClient.signIn.email({ email, password: String(f.get("password")), rememberMe: true });
    s.setBusy(false);
    if (error) {
      if (error.status === 403) {
        setUnverifiedEmail(email);
        return s.setError("Please confirm your email first — we just sent you a new link.");
      }
      return s.setError(error.message ?? "Couldn't sign in.");
    }
    const next = params.get("next");
    const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : home;
    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) {
      router.push(`/two-factor?next=${encodeURIComponent(safeNext)}`);
      return;
    }
    router.push(safeNext);
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit}>
      {params.get("reset") && <div className="note info">Password updated — sign in with your new password.</div>}
      {s.error && <div className="note error">{s.error}</div>}
      {unverifiedEmail && <p className="muted" style={{ fontSize: 13 }}>Sent to {unverifiedEmail}.</p>}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input className="input" id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input className="input" id="password" name="password" type="password" required autoComplete="current-password" />
      </div>
      <button className="btn primary block" disabled={s.busy}>
        {s.busy ? "Signing in…" : "Sign in"}
      </button>
      <p className="auth-foot">
        <Link href="/forgot-password">Forgot your password?</Link>
      </p>
    </form>
  );
}

export function ForgotForm() {
  const s = useSubmit();
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    s.setBusy(true);
    await authClient.requestPasswordReset({ email: String(f.get("email")).trim(), redirectTo: "/reset-password" });
    s.setBusy(false);
    // Same message whether or not the account exists, so this page can't be used to probe emails.
    s.setInfo("If there's an account for that email, a reset link is on its way. It expires in 1 hour.");
  }
  return (
    <form onSubmit={onSubmit}>
      {s.info && <div className="note info">{s.info}</div>}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input className="input" id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <button className="btn primary block" disabled={s.busy}>
        {s.busy ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}

export function ResetForm() {
  const s = useSubmit();
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  if (!token || params.get("error"))
    return (
      <div className="note error">
        This reset link is invalid or has expired. <Link href="/forgot-password">Request a new one</Link>.
      </div>
    );
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const newPassword = String(f.get("password"));
    if (newPassword !== String(f.get("confirm"))) return s.setError("Passwords don't match.");
    s.setBusy(true);
    s.setError(null);
    const { error } = await authClient.resetPassword({ newPassword, token: token! });
    s.setBusy(false);
    if (error) return s.setError(error.message ?? "Couldn't reset your password.");
    router.push("/sign-in?reset=1");
  }
  return (
    <form onSubmit={onSubmit}>
      {s.error && <div className="note error">{s.error}</div>}
      <div className="field">
        <label htmlFor="password">New password</label>
        <input className="input" id="password" name="password" type="password" required minLength={10} autoComplete="new-password" />
      </div>
      <div className="field">
        <label htmlFor="confirm">Confirm new password</label>
        <input className="input" id="confirm" name="confirm" type="password" required minLength={10} autoComplete="new-password" />
      </div>
      <p className="muted" style={{ fontSize: 12.5 }}>This signs you out on all other devices.</p>
      <button className="btn primary block" disabled={s.busy}>
        {s.busy ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}

/** Second sign-in step for accounts with two-factor on: a code from the authenticator app, or a backup code. */
export function TwoFactorForm({ home = "/app" }: { home?: string }) {
  const s = useSubmit();
  const router = useRouter();
  const params = useSearchParams();
  const [useBackup, setUseBackup] = useState(false);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const code = String(f.get("code")).replace(/\s/g, "");
    const trustDevice = f.get("trust") === "on";
    s.setBusy(true);
    s.setError(null);
    const { error } = useBackup
      ? await authClient.twoFactor.verifyBackupCode({ code, trustDevice })
      : await authClient.twoFactor.verifyTotp({ code, trustDevice });
    s.setBusy(false);
    if (error) {
      if (error.status === 401 && /expired|invalid two factor cookie|no two factor/i.test(error.message ?? ""))
        return s.setError("This sign-in has timed out. Please sign in again.");
      if (/invalid/i.test(error.message ?? ""))
        return s.setError(
          useBackup
            ? "That backup code didn't work. Each code can only be used once."
            : "That code didn't work. Codes change every 30 seconds, so use the one showing now.",
        );
      return s.setError(error.message ?? "That code didn't work. Try again.");
    }
    const next = params.get("next");
    router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : home);
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit}>
      {s.error && <div className="note error">{s.error}</div>}
      <div className="field">
        <label htmlFor="code">{useBackup ? "Backup code" : "6-digit code from your authenticator app"}</label>
        <input
          key={useBackup ? "backup" : "totp"}
          className="input code-input"
          id="code"
          name="code"
          required
          autoFocus
          autoComplete="one-time-code"
          inputMode={useBackup ? "text" : "numeric"}
          pattern={useBackup ? undefined : "[0-9 ]{6,7}"}
          maxLength={useBackup ? 32 : 7}
          placeholder={useBackup ? "xxxxx-xxxxx" : "123 456"}
        />
      </div>
      <label className="check-row">
        <input type="checkbox" name="trust" /> Trust this device for 30 days
      </label>
      <button className="btn primary block" disabled={s.busy}>
        {s.busy ? "Checking…" : "Verify and sign in"}
      </button>
      <p className="auth-foot">
        <button type="button" className="link-btn" onClick={() => (setUseBackup((b) => !b), s.setError(null))}>
          {useBackup ? "Use my authenticator app instead" : "Lost your phone? Use a backup code"}
        </button>
      </p>
      <p className="auth-foot">
        <Link href="/sign-in">Back to sign in</Link>
      </p>
    </form>
  );
}
