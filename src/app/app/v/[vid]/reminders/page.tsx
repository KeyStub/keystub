import { RemindersView } from "@/components/reminders-view";
import { getVehicleBundle } from "@/server/data";
import { collectReminders } from "@/server/reminders";
import { requireUser } from "@/server/session";
import { serverToday } from "@/server/today";

export const metadata = { title: "Reminders" };

export default async function RemindersPage({ params }: PageProps<"/app/v/[vid]/reminders">) {
  const user = await requireUser();
  const { vid } = await params;
  const b = await getVehicleBundle(user.id, vid);
  const prefs = { leadDays: user.reminderLeadDays, leadKm: user.reminderLeadKm };
  const list = collectReminders(b, await serverToday(), prefs);
  const raw = Object.fromEntries(b.reminders.map((r) => [r.id, { title: r.title, type: r.type, dueDate: r.dueDate, dueOdometer: r.dueOdometer }]));
  return <RemindersView vehicleId={vid} list={list} raw={raw} prefs={prefs} />;
}
