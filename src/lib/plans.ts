/** Plan definitions: the one place to change what each tier gets. */
export type PlanId = "free" | "pro";

type Feature = { text: string; soon?: boolean };

export const PLANS: Record<
  PlanId,
  {
    name: string;
    maxVehicles: number;
    maxCustomCategories: number;
    blurb: string;
    features: Feature[];
    priceMonthly?: string;
    priceYearly?: string;
  }
> = {
  free: {
    name: "Free",
    maxVehicles: 2,
    maxCustomCategories: 3,
    blurb: "Everything you need to track a car or two.",
    features: [
      { text: "Up to 2 vehicles" },
      { text: "Unlimited fuel, maintenance and cost logs" },
      { text: "EV charging and battery health tracking" },
      { text: "Dashboard, reports and cost per km" },
      { text: "Service and renewal reminders in the app" },
      { text: "Up to 3 custom categories", soon: true },
      { text: "Scheduled payments (e.g. monthly insurance)", soon: true },
      { text: "Export all your data, any time" },
    ],
  },
  pro: {
    name: "Pro",
    maxVehicles: 50,
    maxCustomCategories: 1000,
    priceMonthly: "$3",
    priceYearly: "$24",
    blurb: "For households, multiple vehicles, and less typing.",
    features: [
      { text: "Everything in Free" },
      { text: "Unlimited vehicles" },
      { text: "Unlimited custom categories", soon: true },
      { text: "Receipt scanning: snap a photo, KeyStub fills it in", soon: true },
      { text: "Smart reminders by email and phone when a fill-up or payment is overdue", soon: true },
      { text: "Printable service-history report for resale" },
      { text: "Bank-statement import", soon: true },
    ],
  },
};

/** Side-by-side rows for the pricing page. `true` = included, string = included with detail. */
export const COMPARISON: { label: string; free: boolean | string; pro: boolean | string; soon?: boolean }[] = [
  { label: "Vehicles", free: "2", pro: "Unlimited" },
  { label: "Fuel, maintenance, insurance, registration and other logs", free: "Unlimited", pro: "Unlimited" },
  { label: "Dashboard: total cost, cost per km, cost per month", free: true, pro: true },
  { label: "Gas, diesel, hybrid, plug-in hybrid and electric vehicles", free: true, pro: true },
  { label: "Kilometres or miles, litres or gallons, L/100 km or MPG, and your currency", free: true, pro: true },
  { label: "EV charging log: home vs public, $/kWh, kWh/100 km, savings vs gas", free: true, pro: true },
  { label: "EV battery health tracking", free: true, pro: true },
  { label: "Reports, monthly trends and keep-vs-replace calculator", free: true, pro: true },
  { label: "Duplicate and odometer checks", free: true, pro: true },
  { label: "Service and renewal reminders in the app", free: true, pro: true },
  { label: "Custom categories", free: "Up to 3", pro: "Unlimited", soon: true },
  { label: "Scheduled payments (insurance, loans, subscriptions)", free: true, pro: true, soon: true },
  { label: "Smart reminders when a regular cost hasn't been logged", free: "In the app", pro: "Email and phone", soon: true },
  { label: "Receipt scanning", free: false, pro: true, soon: true },
  { label: "Bank-statement import", free: false, pro: true, soon: true },
  { label: "Printable service-history report", free: false, pro: true },
  { label: "Export everything (JSON and spreadsheet)", free: true, pro: true },
];

export const TRIAL_DAYS = 30;

/** Whole days left in the free Pro trial (0 if none or ended). */
export function trialDaysLeft(user: { trialEndsAt?: Date | string | null }, now = Date.now()) {
  if (!user.trialEndsAt) return 0;
  const ms = new Date(user.trialEndsAt).getTime() - now;
  return ms > 0 ? Math.ceil(ms / 86_400_000) : 0;
}

export function effectivePlan(user: { plan?: string | null; email: string; trialEndsAt?: Date | string | null }): PlanId {
  const founders = (process.env.FOUNDER_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (founders.includes(user.email.toLowerCase())) return "pro";
  if (user.plan === "pro") return "pro";
  return trialDaysLeft(user) > 0 ? "pro" : "free";
}
