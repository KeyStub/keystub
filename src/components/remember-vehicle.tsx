"use client";

import { useEffect } from "react";

/** Remembers the vehicle being viewed so Home (and the phone tab bar elsewhere) opens it next time. */
export function RememberVehicle({ vid }: { vid: string }) {
  useEffect(() => {
    document.cookie = `ks_vid=${vid}; path=/; max-age=31536000; samesite=lax${location.protocol === "https:" ? "; secure" : ""}`;
  }, [vid]);
  return null;
}
