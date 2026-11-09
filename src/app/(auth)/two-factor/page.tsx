import { Suspense } from "react";
import { TwoFactorForm } from "../auth-forms";

export const metadata = { title: "Two-step verification" };

export default function Page() {
  return (
    <>
      <h1>Two-step verification</h1>
      <p className="sub">Enter the code from your authenticator app to finish signing in.</p>
      <Suspense>
        <TwoFactorForm />
      </Suspense>
    </>
  );
}
