"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { DEFAULT_UNITS, makeFmt, type UnitPrefs } from "@/lib/units";

const UnitsContext = createContext<UnitPrefs>(DEFAULT_UNITS);

/** Makes the signed-in user's units and currency available to client components. */
export function UnitsProvider({ prefs, children }: { prefs: UnitPrefs; children: ReactNode }) {
  return <UnitsContext.Provider value={prefs}>{children}</UnitsContext.Provider>;
}

/** Formatting + conversion helpers in the user's units (see src/lib/units.ts). */
export function useFmt() {
  const prefs = useContext(UnitsContext);
  return useMemo(() => makeFmt(prefs), [prefs]);
}
