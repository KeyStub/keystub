import Link from "next/link";
import { Suspense } from "react";
import { SignInForm } from "../auth-forms";

export const metadata = { title: "Sign in" };

export default function Page() {
  return (
    <>
      <h1>Sign in</h1>
      <p className="sub">Welcome back.</p>
      <Suspense>
        <SignInForm />
      </Suspense>
      <p className="auth-foot">
        New here? <Link href="/sign-up">Create an account</Link>
      </p>
    </>
  );
}
