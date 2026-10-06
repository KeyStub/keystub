import { describe, expect, it } from "vitest";
import { fuelEconomySeries, kmRecorded, laterLowerOdometer, monthsSince, priorOdometer, reminderStatus } from "./calc";
import { allDated, chargingStats, totalsByCategory } from "./calc";
import { effectivePlan, trialDaysLeft } from "./plans";

describe("calc", () => {
  it("monthsSince is inclusive and at least 1", () => {
    expect(monthsSince("2024-08-15", "2024-08-20")).toBe(1);
    expect(monthsSince("2024-08-15", "2026-09-30")).toBe(26);
  });

  it("fuel economy is computed full-to-full", () => {
    const f = (id: string, date: string, odometer: number, litres: number, fillType = "full") => ({ id, date, odometer, litres, fillType, totalPaidCents: 0 });
    const s = fuelEconomySeries([f("a", "2026-01-01", 1000, 50), f("b", "2026-01-05", 1300, 20, "partial"), f("c", "2026-01-10", 1500, 30)]);
    expect(s).toHaveLength(1);
    expect(s[0].dist).toBe(500);
    expect(s[0].l100).toBeCloseTo(10); // (20+30)/500*100
  });

  it("km recorded needs two readings", () => {
    expect(kmRecorded([{ odometer: 1000 }], [], null)).toBeNull();
    expect(kmRecorded([{ odometer: 1000 }], [{ odometer: 1500 }], 2000)).toBe(1000);
  });

  it("odometer regression checks", () => {
    const rows = [
      { id: "1", date: "2026-01-01", odometer: 1000 },
      { id: "2", date: "2026-02-01", odometer: 2000 },
    ];
    expect(priorOdometer(rows, "2026-01-15")).toEqual({ date: "2026-01-01", odo: 1000 });
    expect(laterLowerOdometer(rows, "2026-01-15", 2500)).toEqual({ date: "2026-02-01", odo: 2000 });
    expect(laterLowerOdometer(rows, "2026-01-15", 1500)).toBeNull();
    // Two fill-ups or charges on the same day (road trip): order within a day is unknown, so no warning.
    expect(laterLowerOdometer(rows, "2026-02-01", 2400)).toBeNull();
    expect(priorOdometer(rows, "2026-02-01")).toEqual({ date: "2026-01-01", odo: 1000 });
  });

  it("reminder status", () => {
    expect(reminderStatus({ dueDate: "2026-09-01", dueOdometer: null }, "2026-09-30", null)).toBe("overdue");
    expect(reminderStatus({ dueDate: "2026-10-20", dueOdometer: null }, "2026-09-30", null)).toBe("soon");
    expect(reminderStatus({ dueDate: null, dueOdometer: 100400 }, "2026-09-30", 100000)).toBe("soon");
    expect(reminderStatus({ dueDate: "2027-09-01", dueOdometer: null }, "2026-09-30", null)).toBe("upcoming");
  });
});

describe("free trial", () => {
  const now = Date.parse("2026-10-05T12:00:00Z");
  it("counts whole days left and ends cleanly", () => {
    expect(trialDaysLeft({ trialEndsAt: new Date(now + 29.2 * 86_400_000) }, now)).toBe(30);
    expect(trialDaysLeft({ trialEndsAt: new Date(now - 1000) }, now)).toBe(0);
    expect(trialDaysLeft({ trialEndsAt: null }, now)).toBe(0);
  });
  it("gives Pro during the trial, Free after", () => {
    expect(effectivePlan({ email: "a@b.c", plan: "free", trialEndsAt: new Date(Date.now() + 86_400_000) })).toBe("pro");
    expect(effectivePlan({ email: "a@b.c", plan: "free", trialEndsAt: new Date(Date.now() - 86_400_000) })).toBe("free");
    expect(effectivePlan({ email: "a@b.c", plan: "pro", trialEndsAt: null })).toBe("pro");
  });
});

describe("EV charging", () => {
  const s = (id: string, date: string, kwh: number, cents: number, location: string, odometer: number | null) => ({ id, date, kwh, costCents: cents, location, odometer });
  const rows = [
    s("a", "2026-01-01", 40, 720, "home", 10_000),
    s("b", "2026-01-08", 30, 540, "home", 10_200),
    s("c", "2026-01-15", 50, 2500, "fast", 10_500),
  ];
  it("computes efficiency, cost per km and savings vs gas over the measured span", () => {
    const st = chargingStats(rows, { l100: 9, fuelPrice: 1.6 });
    expect(st.totalKwh).toBe(120);
    expect(st.distanceKm).toBe(500);
    expect(st.kwhPer100).toBeCloseTo(16); // (30 + 50) kWh / 500 km
    expect(st.centsPerKm).toBeCloseTo(6.08); // (540 + 2500) / 500
    expect(st.gasEquivalentCents).toBe(7200); // 500 km × 9 L/100 × $1.60
    expect(st.savingsCents).toBe(7200 - 3040);
    expect(st.byLocation.home.kwh).toBe(70);
    expect(st.avgPricePerKwh).toBeCloseTo(0.3133, 3);
  });
  it("needs two odometer readings for efficiency", () => {
    expect(chargingStats([rows[0]], { l100: 9, fuelPrice: 1.6 }).kwhPer100).toBeNull();
  });
  it("counts charging as its own category and rebates as money back", () => {
    const t = totalsByCategory(
      allDated([], [], [{ id: "r", date: "2026-02-01", type: "Rebate / incentive", amountCents: 500000 }], rows),
    );
    expect(t.Charging).toBe(3760);
    expect(t.Other).toBe(-500000);
  });
});
