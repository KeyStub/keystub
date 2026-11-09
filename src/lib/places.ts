/**
 * Saved fill-up stations and charging networks: what to suggest in the station field.
 * Pure functions (no server or browser APIs) so they're shared and tested.
 */

export type PlaceKind = "fuel" | "charging";

export type PlaceOption = {
  /** saved place id; null for a name that only appears in past entries */
  id: string | null;
  name: string;
  saved: boolean;
  /** entries using this name in the last 12 months */
  uses: number;
  lastUsed: string | null;
  lat: number | null;
  lng: number | null;
};

export type PlacesData = { kind: PlaceKind; options: PlaceOption[] };

export const placeKey = (name: string) => name.trim().toLowerCase();

/** Saved places first (most used first), then unsaved names from history (most used first). */
export function sortPlaces(options: PlaceOption[]): PlaceOption[] {
  return [...options].sort(
    (a, b) =>
      Number(b.saved) - Number(a.saved) || b.uses - a.uses || (b.lastUsed ?? "").localeCompare(a.lastUsed ?? "") || a.name.localeCompare(b.name),
  );
}

/** Default for a new entry: the most-used saved place, else the most-used name from history. */
export function suggestPlace(options: PlaceOption[]): PlaceOption | null {
  const withUse = options.filter((o) => o.saved || o.uses > 0);
  return sortPlaces(withUse)[0] ?? null;
}

/** Great-circle distance in metres. */
export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** The saved place you're standing at (within `radiusM`), if any. Nearest wins. */
export function nearestPlace(options: PlaceOption[], here: { lat: number; lng: number }, radiusM = 300): (PlaceOption & { distance: number }) | null {
  let best: (PlaceOption & { distance: number }) | null = null;
  for (const o of options) {
    if (!o.saved || o.lat == null || o.lng == null) continue;
    const d = distanceM(here, { lat: o.lat, lng: o.lng });
    if (d <= radiusM && (!best || d < best.distance)) best = { ...o, distance: d };
  }
  return best;
}

export const isSavedName = (options: PlaceOption[], name: string) => options.some((o) => o.saved && placeKey(o.name) === placeKey(name));
