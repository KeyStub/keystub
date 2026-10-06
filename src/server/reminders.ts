import "server-only";
import { reminderStatus, type ReminderStatus } from "@/lib/calc";
import type { VehicleBundle } from "./data";

export type ReminderView = {
  id: string;
  title: string;
  dueDate: string | null;
  dueOdometer: number | null;
  status: ReminderStatus;
  /** Derived from the vehicle profile or a cost's next-due date — edit it there, not here. */
  virtual: boolean;
  sourceType: string;
};

export type ReminderPrefs = { leadDays: number; leadKm: number };

/** Open reminders + ones implied by renewal dates and recurring costs, most urgent first. */
export function collectReminders(b: VehicleBundle, today: string, prefs: ReminderPrefs = { leadDays: 30, leadKm: 500 }): ReminderView[] {
  // Highest known reading — the profile's odometer may never have been filled in.
  const readings = [b.vehicle.currentOdometer, ...b.fuel.map((r) => r.odometer), ...b.maintenance.map((r) => r.odometer), ...b.charges.map((r) => r.odometer), ...b.battery.map((r) => r.odometer)].filter(
    (o): o is number => o != null,
  );
  const odo = readings.length ? Math.max(...readings) : null;
  const list: ReminderView[] = b.reminders
    .filter((r) => !r.completedAt)
    .map((r) => ({
      id: r.id,
      title: r.title,
      dueDate: r.dueDate,
      dueOdometer: r.dueOdometer,
      status: reminderStatus(r, today, odo, prefs.leadDays, prefs.leadKm),
      virtual: false,
      sourceType: r.sourceType,
    }));
  const virtual = (id: string, title: string, dueDate: string) =>
    list.push({ id, title, dueDate, dueOdometer: null, status: reminderStatus({ dueDate, dueOdometer: null }, today, odo, prefs.leadDays, prefs.leadKm), virtual: true, sourceType: "vehicle" });
  if (b.vehicle.insuranceRenewalDate) virtual("veh-ins", "Insurance renewal", b.vehicle.insuranceRenewalDate);
  if (b.vehicle.registrationRenewalDate) virtual("veh-reg", "Registration renewal", b.vehicle.registrationRenewalDate);
  // Latest next-due date per cost type (older entries' next-due dates are superseded).
  const latestByType = new Map<string, { date: string; due: string }>();
  for (const c of b.costs) {
    if (!c.nextDueDate) continue;
    const cur = latestByType.get(c.type);
    if (!cur || c.date > cur.date) latestByType.set(c.type, { date: c.date, due: c.nextDueDate });
  }
  for (const [type, { due }] of latestByType) virtual(`cost-${type}`, `${type} due`, due);

  const order = { overdue: 0, soon: 1, upcoming: 2 };
  return list.sort((a, b) => order[a.status] - order[b.status] || (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
}
