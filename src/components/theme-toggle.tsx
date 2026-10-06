"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY as KEY } from "@/lib/theme";

export type ThemePref = "system" | "light" | "dark";

const EVENT = "keystub-theme";

function read(): ThemePref {
  try {
    const t = localStorage.getItem(KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

export function applyTheme(t: ThemePref) {
  try {
    if (t === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, t);
  } catch {}
  if (t === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", t);
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useTheme(): ThemePref {
  return useSyncExternalStore(subscribe, read, () => "system");
}

const ICON = {
  light: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  dark: <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />,
  system: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </>
  ),
};
const LABEL: Record<ThemePref, string> = { system: "Match device", light: "Light", dark: "Dark" };
const NEXT: Record<ThemePref, ThemePref> = { system: "light", light: "dark", dark: "system" };

const Svg = ({ t, size = 18 }: { t: ThemePref; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {ICON[t]}
  </svg>
);

/** Compact button for top bars: cycles Match device → Light → Dark. */
export function ThemeButton({ className = "theme-btn" }: { className?: string }) {
  const t = useTheme();
  return (
    <button
      type="button"
      className={className}
      onClick={() => applyTheme(NEXT[t])}
      aria-label={`Theme: ${LABEL[t]}. Switch to ${LABEL[NEXT[t]]}`}
      title={`Theme: ${LABEL[t]}`}
    >
      <Svg t={t} />
    </button>
  );
}

/** Three-option control for settings pages. */
export function ThemeSegmented() {
  const t = useTheme();
  return (
    <div className="seg" role="radiogroup" aria-label="Theme">
      {(["system", "light", "dark"] as ThemePref[]).map((opt) => (
        <button key={opt} type="button" role="radio" aria-checked={t === opt} className={t === opt ? "on" : ""} onClick={() => applyTheme(opt)}>
          <Svg t={opt} size={16} /> {LABEL[opt]}
        </button>
      ))}
    </div>
  );
}
