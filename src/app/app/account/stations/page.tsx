import { SavedPlacesSettings } from "@/components/places";
import { getPlaces } from "@/server/data";
import { requireUser } from "@/server/session";

export const metadata = { title: "Saved stations" };

export default async function StationsPage() {
  const user = await requireUser();
  return (
    <>
      <h2 className="acc-h2">Saved stations</h2>
      <p className="muted" style={{ marginTop: 0, fontSize: 14 }}>
        Your favourite fill-up stations and charging networks appear first when you log an entry, and the one you use most fills in automatically.
      </p>
      <SavedPlacesSettings fuel={await getPlaces(user.id, "fuel")} charging={await getPlaces(user.id, "charging")} />
    </>
  );
}
