import Link from "next/link";
import { DeleteAccount, ProfileForm } from "@/components/account-forms";
import { requireUser } from "@/server/session";
import { staffInfoFor } from "@/server/staff";

export const metadata = { title: "Account" };

export default async function ProfilePage() {
  const user = await requireUser();
  const staff = await staffInfoFor(user.email);
  return (
    <>
      {staff && (
        <div className="note info" style={{ marginBottom: 12 }}>
          <b>KeyStub Admin:</b> <Link href="/admin">Open the admin area</Link> (only staff can see this).
        </div>
      )}
      <h2 className="acc-h2">Profile</h2>
      <ProfileForm name={user.name} email={user.email} />
      <h3 className="section-title">Delete account</h3>
      <DeleteAccount />
    </>
  );
}
