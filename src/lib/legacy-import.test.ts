import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { mapExport, mapFuel, mapMaintenance, summarizeMapped, summarizeRaw, toCents } from "./legacy-import";

describe("toCents", () => {
  it("rounds float dollars to exact cents", () => {
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents(3656.29)).toBe(365629);
    expect(toCents(null)).toBeNull();
    expect(toCents("")).toBeNull();
  });
});

describe("field-name drift", () => {
  it("maps fullTank/fuelGrade and fillType/grade to the same fields", () => {
    expect(mapFuel({ id: "a", date: "2026-01-01", totalPaid: 10, fullTank: true, fuelGrade: "Premium" })).toMatchObject({ fillType: "full", grade: "Premium" });
    expect(mapFuel({ id: "b", date: "2026-01-01", totalPaid: 10, fillType: "partial", grade: "Regular" })).toMatchObject({ fillType: "partial", grade: "Regular" });
    expect(mapFuel({ id: "c", date: "2026-01-01", totalPaid: 10, fullTank: null })).toMatchObject({ fillType: null });
  });
  it("maps taxCost/tax and warrantyInfo/warranty", () => {
    expect(mapMaintenance({ id: "m", date: "2026-01-01", totalCost: 1, taxCost: 1.5, warrantyInfo: "1yr" })).toMatchObject({ taxCents: 150, warrantyInfo: "1yr" });
    expect(mapMaintenance({ id: "n", date: "2026-01-01", totalCost: 1, tax: 2, warranty: "2yr" })).toMatchObject({ taxCents: 200, warrantyInfo: "2yr" });
  });
  it("flags the known suspect records", () => {
    expect(mapFuel({ id: "legacy-gas-0018", date: "2026-09-06", totalPaid: 72.74 }).reviewFlag).toMatch(/duplicate/i);
    expect(mapFuel({ id: "gas-2026-07-10", date: "2026-07-10", totalPaid: 1 }).reviewFlag).toBeNull();
  });
});

const HANDOFF = process.env.HANDOFF_EXPORT ?? "C:/Users/jarin/Downloads/santa-fe-tracker-data-export.json";

describe.skipIf(!existsSync(HANDOFF))("real handoff export", () => {
  const raw = JSON.parse(readFileSync(HANDOFF, "utf8"));
  it("matches the totals in the handoff document", () => {
    const s = summarizeRaw(raw);
    expect(s.vehicles).toBe(1);
    expect(s.fuel).toEqual({ count: 45, cents: 323574 });
    expect(s.maintenance).toEqual({ count: 16, cents: 537797 });
    expect(s.costs).toEqual({ count: 29, cents: 1065553 });
  });
  it("maps without errors and without changing totals", () => {
    const m = mapExport(raw);
    expect(m.errors).toEqual([]);
    expect(summarizeMapped(m)).toEqual(summarizeRaw(raw));
    expect(m.fuel.filter((r) => r.reviewFlag).map((r) => r.legacyId).sort()).toEqual(["legacy-gas-0018", "legacy-gas-0027", "legacy-gas-0038"]);
    expect(m.fuel.find((r) => r.legacyId === "gas-2026-09-16-b")).toMatchObject({ fillType: "full", grade: "Regular", litres: 46.9, odometer: 255555 });
  });
});
