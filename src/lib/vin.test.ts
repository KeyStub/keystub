import { describe, expect, it } from "vitest";
import { checkDigitOk, decodeVinLocally, modelYear, normalizeVin, usesCheckDigit, VIN_RE } from "./vin";

describe("VIN", () => {
  it("validates format and check digits", () => {
    expect(VIN_RE.test("1HGCM82633A004352")).toBe(true);
    expect(VIN_RE.test("1HGCM82633A00435")).toBe(false); // 16 chars
    expect(VIN_RE.test("1HGCM82633A0O4352")).toBe(false); // O is never used
    expect(checkDigitOk("1HGCM82633A004352")).toBe(true); // the textbook example VIN
    expect(checkDigitOk("1HGCM82643A004352")).toBe(false);
    expect(normalizeVin(" 1hgcm8 2633a004352 ")).toBe("1HGCM82633A004352");
    expect(usesCheckDigit("LRW3E7FA9MC000000")).toBe(false);
  });

  it("reads the model year", () => {
    expect(modelYear("1HGCM82633A004352")).toBe(2003); // digit in position 7 → 1980–2009 cycle
    expect(modelYear("5YJ3E1EA7KF317000")).toBe(2019); // letter in position 7 → 2010+
    expect(modelYear("LRW3E7FA9MC000000", 2026)).toBe(2021); // non-NA: most recent year not in the future
    expect(modelYear("LRW3E7FA9MC00000Z".replace("M", "?"), 2026)).toBeNull();
  });

  it("decodes Teslas built outside the US (not in NHTSA's database)", () => {
    expect(decodeVinLocally("LRW3E7FA9MC000000")).toEqual({ year: 2021, make: "Tesla", model: "Model 3", country: "China", plant: "Shanghai, China", powertrain: "ev" });
    expect(decodeVinLocally("XP7YGCEK0PB000000").make).toBe("Tesla");
    expect(decodeVinLocally("XP7YGCEK0PB000000").model).toBe("Model Y");
  });

  it("knows common manufacturers and leaves unknown ones blank", () => {
    expect(decodeVinLocally("2T1BURHE0JC000000").make).toBe("Toyota");
    expect(decodeVinLocally("JTHBA1D20G5000000").make).toBe("Lexus");
    expect(decodeVinLocally("ZZZ00000000000000").make).toBeNull();
  });
});
