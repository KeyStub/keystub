import Link from "next/link";
import { SignUpForm } from "../auth-forms";

export const metadata = { title: "Create account" };

export default function Page() {
  return (
    <>
      <h1>Create your account</h1>
      <p className="sub">Free for up to 2 vehicles, plus 30 days of Pro on us. No card needed.</p>
      <SignUpForm />
      <p className="auth-foot">
        Already have an account? <Link href="/sign-in">Sign in</Link>
      </p>
    </>
  );
}
