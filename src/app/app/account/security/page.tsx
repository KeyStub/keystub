import { PasswordForm } from "@/components/account-forms";
import { TwoFactorSettings } from "@/components/two-factor-settings";
import { requireUser } from "@/server/session";

export const metadata = { title: "Security" };

export default async function SecurityPage() {
  const user = await requireUser();
  return (
    <>
      <h2 className="acc-h2">Security</h2>
      <h3 className="section-title" style={{ marginTop: 0 }}>
        Password
      </h3>
      <PasswordForm />
      <TwoFactorSettings enabled={!!(user as { twoFactorEnabled?: boolean | null }).twoFactorEnabled} email={user.email} />
    </>
  );
}
