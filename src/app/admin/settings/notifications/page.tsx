import { NotifySettingsForm } from "@/components/admin";
import { SUPPORT_EMAIL } from "@/lib/admin";
import { requireStaff } from "@/server/staff";
import { getNotifySettings } from "@/server/tickets";

export const metadata = { title: "Notifications" };

export default async function Notifications() {
  await requireStaff("templates");
  return (
    <div style={{ maxWidth: 720 }}>
      <h1 className="adm-h1">Notifications</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Heads-up emails to the support inbox, so you know when something needs attention without keeping Admin open. Turn them off if you work from the
        ticket list instead.
      </p>
      <NotifySettingsForm value={await getNotifySettings()} inbox={SUPPORT_EMAIL()} />
    </div>
  );
}
