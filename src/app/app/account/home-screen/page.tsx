import { HomeScreenSettings } from "@/components/customize";
import { getPrefs } from "@/server/data";
import { requireUser } from "@/server/session";

export const metadata = { title: "Home screen" };

export default async function HomeScreenPage() {
  const user = await requireUser();
  const { dashboard } = await getPrefs(user.id);
  return (
    <>
      <h2 className="acc-h2">Home screen</h2>
      <p className="muted" style={{ marginTop: 0, fontSize: 14 }}>
        Choose what your vehicle dashboard shows, and in what order. Untick anything you don&apos;t need.
      </p>
      <HomeScreenSettings prefs={dashboard} />
    </>
  );
}
