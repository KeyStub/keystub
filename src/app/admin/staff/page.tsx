import { inArray } from "drizzle-orm";
import { StaffManager } from "@/components/admin";
import { db } from "@/db";
import { staff, user } from "@/db/schema";
import { ROLES } from "@/lib/admin";
import { requireStaff } from "@/server/staff";

export const metadata = { title: "Staff" };

export default async function StaffPage() {
  const me = await requireStaff("staff");
  const rows = await db.select().from(staff).orderBy(staff.createdAt);
  const accounts = rows.length
    ? await db
        .select({ email: user.email, twoFactorEnabled: user.twoFactorEnabled })
        .from(user)
        .where(inArray(user.email, rows.map((r) => r.email)))
    : [];
  const envOwners = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return (
    <>
      <h1 className="adm-h1">Staff</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        People who can open KeyStub Admin. Staff use separate work accounts: they open straight into Admin, have no garage, and must turn on two-step
        verification.
      </p>
      <div className="adm-roles">
        {ROLES.map((r) => (
          <div key={r.id} className="card">
            <b>{r.label}</b>
            <div className="muted" style={{ fontSize: 13 }}>{r.description}</div>
          </div>
        ))}
      </div>
      <StaffManager
        myEmail={me.user.email}
        envOwners={envOwners}
        rows={rows.map((r) => {
          const a = accounts.find((x) => x.email.toLowerCase() === r.email.toLowerCase());
          return { id: r.id, email: r.email, name: r.name, role: r.role, addedBy: r.addedBy, createdAt: r.createdAt.toLocaleDateString("en-CA", { dateStyle: "medium" }), hasAccount: !!a, twoFactor: !!a?.twoFactorEnabled };
        })}
      />
      {!process.env.ADMIN_EMAILS && (
        <div className="note" style={{ marginTop: 16, fontSize: 13.5 }}>
          <b>Setting up your own staff account:</b> create a work account (e.g. admin@keystub.com), then in Vercel add the setting{" "}
          <code>ADMIN_EMAILS</code> = that email and redeploy. That account becomes the owner, and your personal account goes back to being just your garage.
        </div>
      )}
    </>
  );
}
