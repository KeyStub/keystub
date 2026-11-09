import { AppearanceSettings, EnergySettings, ReminderSettings, UnitSettings } from "@/components/settings-forms";
import { requireUser } from "@/server/session";

export const metadata = { title: "Preferences" };

export default async function PreferencesPage() {
  const user = await requireUser();
  return (
    <>
      <h2 className="acc-h2">Preferences</h2>
      <h3 className="section-title" id="appearance" style={{ marginTop: 0 }}>
        Appearance
      </h3>
      <AppearanceSettings />
      <h3 className="section-title" id="units">
        Units &amp; currency
      </h3>
      <UnitSettings prefs={user.units} />
      <h3 className="section-title" id="reminders">
        Reminders
      </h3>
      <ReminderSettings leadDays={user.reminderLeadDays} leadKm={user.reminderLeadKm} />
      <h3 className="section-title" id="energy">
        Energy (EVs &amp; plug-in hybrids)
      </h3>
      <EnergySettings homeKwhPrice={user.homeKwhPrice} compareL100={user.compareL100} compareFuelPrice={user.compareFuelPrice} />
    </>
  );
}
