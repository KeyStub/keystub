import Link from "next/link";
import { onAdminSite } from "@/server/site";
import { SignUpForm } from "../auth-forms";

export const metadata = { title: "Create account" };

export default async function Page() {
  const staff = await onAdminSite();
  return staff ? (
    <>
      <h1>Create your staff account</h1>
      <p className="sub">For KeyStub team members. Use the work email you were invited with. You&apos;ll turn on two-step verification right after.</p>
      <SignUpForm staff />
      <p className="auth-foot">
        Already set up? <Link href="/sign-in">Sign in</Link>
      </p>
    </>
  ) : (
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
