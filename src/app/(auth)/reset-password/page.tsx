import { Suspense } from "react";
import { ResetForm } from "../auth-forms";

export const metadata = { title: "Choose a new password" };

export default function Page() {
  return (
    <>
      <h1>Choose a new password</h1>
      <p className="sub">Pick something you don&apos;t use anywhere else.</p>
      <Suspense>
        <ResetForm />
      </Suspense>
    </>
  );
}
