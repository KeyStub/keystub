import { describe, expect, it } from "vitest";
import { distanceM, isSavedName, nearestPlace, suggestPlace, type PlaceOption } from "./places";

const opt = (o: Partial<PlaceOption> & { name: string }): PlaceOption => ({ id: null, saved: false, uses: 0, lastUsed: null, lat: null, lng: null, ...o });

// Three saved stations in one town; "Station 3" is used most.
const s1 = opt({ id: "1", name: "Station 1", saved: true, uses: 4, lat: 49.4993, lng: -113.9502 });
const s2 = opt({ id: "2", name: "Station 2", saved: true, uses: 2, lat: 49.5056, lng: -113.9631 });
const s3 = opt({ id: "3", name: "Station 3", saved: true, uses: 11, lat: 49.4871, lng: -113.9429 });
const unsaved = opt({ name: "Highway Gas", uses: 20 });

describe("saved places", () => {
  it("suggests the most-used saved station, even if an unsaved one was used more", () => {
    expect(suggestPlace([s1, s2, s3, unsaved])?.name).toBe("Station 3");
  });

  it("falls back to the most-used name from history when nothing is saved", () => {
    expect(suggestPlace([unsaved, opt({ name: "Other", uses: 3 })])?.name).toBe("Highway Gas");
    expect(suggestPlace([])).toBeNull();
  });

  it("picks the saved station you're standing at over the usual one", () => {
    const atStation1 = { lat: 49.4994, lng: -113.9504 }; // ~20 m away
    expect(nearestPlace([s1, s2, s3], atStation1)?.name).toBe("Station 1");
    expect(nearestPlace([s1, s2, s3], { lat: 49.6, lng: -114.1 })).toBeNull(); // nowhere near any
  });

  it("measures distance sensibly", () => {
    expect(Math.round(distanceM({ lat: 0, lng: 0 }, { lat: 0, lng: 1 }) / 1000)).toBe(111);
  });

  it("matches saved names regardless of case and spacing", () => {
    expect(isSavedName([s3], "  station 3 ")).toBe(true);
    expect(isSavedName([s3, unsaved], "Highway Gas")).toBe(false);
  });
});
