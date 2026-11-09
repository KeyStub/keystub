import { PasswordForm } from "@/components/account-forms";
import { TwoFactorSettings } from "@/components/two-factor-settings";
import { requireStaff } from "@/server/staff";

export const metadata = { title: "My security" };

export default async function AdminSecurity({ searchParams }: PageProps<"/admin/security">) {
  const me = await requireStaff(undefined, { allowWithout2fa: true });
  const setup = (await searchParams).setup === "1";
  return (
    <div style={{ maxWidth: 720 }}>
      <h1 className="adm-h1">My security</h1>
      {setup && !me.twoFactor && (
        <div className="note" style={{ marginBottom: 12 }}>
          <b>Two-step verification is required for staff.</b> Turn it on below to open the rest of KeyStub Admin.
        </div>
      )}
      <TwoFactorSettings enabled={me.twoFactor} email={me.user.email} />
      <h3 className="section-title">Password</h3>
      <PasswordForm />
    </div>
  );
}
