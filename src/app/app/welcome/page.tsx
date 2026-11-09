import { Onboarding } from "@/components/onboarding";
import { listVehicles } from "@/server/data";
import { requireUser } from "@/server/session";
import "../../(marketing)/marketing.css"; // the phone mockups reuse the homepage styles

export const metadata = { title: "Welcome" };

/** The welcome tour: shown once after sign-up, and any time from Account → Help & feedback. */
export default async function WelcomePage({ searchParams }: PageProps<"/app/welcome">) {
  const user = await requireUser();
  const vs = await listVehicles(user.id);
  const sp = await searchParams;
  return (
    <Onboarding
      firstName={user.name?.trim().split(/\s+/)[0] || null}
      hasVehicles={vs.length > 0}
      replay={sp.replay === "1" || !!user.onboardedAt}
      units={user.units}
      trialDaysLeft={user.trialDaysLeft}
      isPro={user.effectivePlan === "pro"}
    />
  );
}
