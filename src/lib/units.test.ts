import { describe, expect, it } from "vitest";
import { countryFromHeaders, defaultsForCountry, makeFmt, toMetric, unitPrefsOf, type UnitPrefs } from "./units";

const US: UnitPrefs = { distanceUnit: "mi", volumeUnit: "gal", economyUnit: "mpg", currency: "USD" };
const CA: UnitPrefs = { distanceUnit: "km", volumeUnit: "L", economyUnit: "l100", currency: "CAD" };

describe("units", () => {
  it("metric is a pass-through", () => {
    const m = toMetric(CA);
    expect(m.dist(123456)).toBe(123456);
    expect(m.vol(45.2)).toBe(45.2);
    expect(m.perVol(1.459)).toBe(1.459);
    expect(m.econ(9.4)).toBe(9.4);
    const f = makeFmt(CA);
    expect(f.dist(123456)).toBe("123,456 km");
    expect(f.econ(9.4)).toBe("9.4 L/100 km");
    expect(f.money(12345)).toBe("$123.45");
  });

  it("miles and gallons convert to metric and back without drift", () => {
    const m = toMetric(US);
    const f = makeFmt(US);
    // odometer: whole miles survive the round trip through whole km
    for (const mi of [0, 1, 99_999, 100_001, 254_321]) expect(f.distInput(m.dist(mi))).toBe(String(mi));
    expect(m.dist(100)).toBe(161);
    // 12.345 gal -> litres -> back
    expect(f.volInput(m.vol(12.345))).toBe("12.345");
    // $3.499 / gal -> $/L -> back
    expect(f.perVolInput(m.perVol(3.499))).toBe("3.499");
    expect(m.perVol(3.785411784)).toBeCloseTo(1);
  });

  it("fuel economy conversions", () => {
    const us = makeFmt(US);
    expect(us.econToUser(9.4)).toBeCloseTo(25.02, 1); // 9.4 L/100 km ≈ 25 MPG (US)
    expect(toMetric(US).econ(30)).toBeCloseTo(7.84, 2); // 30 MPG ≈ 7.84 L/100 km
    const uk = makeFmt({ ...US, volumeUnit: "L", economyUnit: "mpgimp", currency: "GBP" });
    expect(uk.econ(9.4)).toBe("30.1 MPG (UK)");
    expect(makeFmt({ ...CA, economyUnit: "kml" }).econ(10)).toBe("10.0 km/L");
  });

  it("EV efficiency and cost per distance", () => {
    const us = makeFmt(US);
    expect(us.evEffUnit).toBe("mi/kWh");
    expect(us.evEffValue(17.8)).toBe("3.49"); // 17.8 kWh/100 km ≈ 3.49 mi/kWh
    expect(makeFmt(CA).evEffValue(17.8)).toBe("17.8");
    expect(us.perDist(10)).toBe("$0.16"); // 10¢/km = 16¢/mile
    expect(makeFmt(CA).perDist(5.5)).toBe("$0.055");
  });

  it("currency formatting", () => {
    expect(makeFmt({ ...CA, currency: "GBP" }).money(12345)).toBe("£123.45");
    expect(makeFmt({ ...CA, currency: "EUR" }).money(12345)).toBe("€123.45");
    expect(makeFmt(US).moneyLabel("Total paid")).toBe("Total paid ($)");
  });

  it("defaults from the visitor's country", () => {
    expect(defaultsForCountry("US")).toEqual(US);
    expect(defaultsForCountry("CA")).toEqual(CA);
    expect(defaultsForCountry("gb").currency).toBe("GBP");
    expect(defaultsForCountry("DE").currency).toBe("EUR");
    expect(defaultsForCountry(null)).toEqual(CA);
    expect(countryFromHeaders(new Headers({ "x-vercel-ip-country": "US", "accept-language": "en-CA" }))).toBe("US");
    expect(countryFromHeaders(new Headers({ "accept-language": "en-US,en;q=0.9" }))).toBe("US");
    expect(countryFromHeaders(new Headers({ "accept-language": "fr" }))).toBeNull();
  });

  it("bad stored values fall back to defaults", () => {
    expect(unitPrefsOf({ distanceUnit: "parsecs", currency: "XYZ" })).toEqual(CA);
  });
});
