import { describe, expect, it } from "vitest";
import { fuelEconomySeries, kmRecorded, laterLowerOdometer, monthsSince, priorOdometer, reminderStatus } from "./calc";
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
