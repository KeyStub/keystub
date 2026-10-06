import Link from "next/link";
import { ForgotForm } from "../auth-forms";

export const metadata = { title: "Reset password" };

export default function Page() {
  return (
    <>
      <h1>Forgot your password?</h1>
      <p className="sub">Enter your email and we&apos;ll send you a reset link.</p>
      <ForgotForm />
      <p className="auth-foot">
        <Link href="/sign-in">Back to sign in</Link>
      </p>
    </>
  );
}
