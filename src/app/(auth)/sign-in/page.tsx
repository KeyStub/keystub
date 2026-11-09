import Link from "next/link";
import { Suspense } from "react";
import { onAdminSite } from "@/server/site";
import { SignInForm } from "../auth-forms";

export const metadata = { title: "Sign in" };

export default async function Page() {
  const staff = await onAdminSite();
  return (
    <>
      <h1>{staff ? "Staff sign in" : "Sign in"}</h1>
      <p className="sub">{staff ? "Sign in with your KeyStub work account." : "Welcome back."}</p>
      <Suspense>
        <SignInForm home={staff ? "/" : "/app"} />
      </Suspense>
      <p className="auth-foot">
        {staff ? (
          <>
            Just joined the team? <Link href="/sign-up">Create your staff account</Link>
          </>
        ) : (
          <>
            New here? <Link href="/sign-up">Create an account</Link>
          </>
        )}
      </p>
    </>
  );
}
