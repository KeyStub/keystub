"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

function useSubmit() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  return { busy, setBusy, error, setError, info, setInfo };
}

export function SignUpForm() {
  const s = useSubmit();
  const [done, setDone] = useState(false);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get("password"));
    if (password !== String(f.get("confirm"))) return s.setError("Passwords don't match.");
    s.setBusy(true);
    s.setError(null);
    const { error } = await authClient.signUp.email({
      name: String(f.get("name")).trim(),
      email: String(f.get("email")).trim(),
      password,
      callbackURL: "/app",
    });
    s.setBusy(false);
    if (error) return s.setError(error.message ?? "Couldn't create your account.");
    setDone(true);
  }
  if (done)
    return (
      <div className="note info">
        Check your inbox — we sent a link to confirm your email. Once confirmed you&apos;ll be signed in automatically.
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

export function SignInForm() {
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
    const { error } = await authClient.signIn.email({ email, password: String(f.get("password")), rememberMe: true });
    s.setBusy(false);
    if (error) {
      if (error.status === 403) {
        setUnverifiedEmail(email);
        return s.setError("Please confirm your email first — we just sent you a new link.");
      }
      return s.setError(error.message ?? "Couldn't sign in.");
    }
    const next = params.get("next");
    router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : "/app");
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
