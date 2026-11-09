import { Suspense } from "react";
import { onAdminSite } from "@/server/site";
import { TwoFactorForm } from "../auth-forms";

export const metadata = { title: "Two-step verification" };

export default async function Page() {
  const staff = await onAdminSite();
  return (
    <>
      <h1>Two-step verification</h1>
      <p className="sub">Enter the code from your authenticator app to finish signing in.</p>
      <Suspense>
        <TwoFactorForm home={staff ? "/" : "/app"} />
      </Suspense>
    </>
  );
}
