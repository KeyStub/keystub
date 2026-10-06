/* Line icons in the Out-of-Spec-style: 1.8px strokes, round joins, single colour (currentColor). */
import type { ReactNode } from "react";

function I({ children, size = 22 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export const IconPump = (p: { size?: number }) => (
  <I {...p}>
    <path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16" />
    <path d="M3 21h13" />
    <path d="M7 7h5v4H7z" />
    <path d="M15 9h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V8l-3-3" />
  </I>
);
export const IconWrench = (p: { size?: number }) => (
  <I {...p}>
    <path d="M14.7 6.3a4 4 0 0 0-5.3 5.3L3.5 17.5a2.1 2.1 0 0 0 3 3l5.9-5.9a4 4 0 0 0 5.3-5.3l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6z" />
  </I>
);
export const IconBell = (p: { size?: number }) => (
  <I {...p}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
    <path d="M10.3 20a2 2 0 0 0 3.4 0" />
  </I>
);
export const IconScale = (p: { size?: number }) => (
  <I {...p}>
    <path d="M12 3v18" />
    <path d="M5 21h14" />
    <path d="M3 7h18" />
    <path d="M6 7l-3 7a3 3 0 0 0 6 0z" />
    <path d="M18 7l-3 7a3 3 0 0 0 6 0z" />
  </I>
);
export const IconDownload = (p: { size?: number }) => (
  <I {...p}>
    <path d="M12 3v12" />
    <path d="M7 10l5 5 5-5" />
    <path d="M4 21h16" />
  </I>
);
export const IconShield = (p: { size?: number }) => (
  <I {...p}>
    <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
    <path d="M9 12l2 2 4-4" />
  </I>
);
export const IconGauge = (p: { size?: number }) => (
  <I {...p}>
    <path d="M3.5 17a9 9 0 1 1 17 0" />
    <path d="M12 13l4-5" />
    <circle cx="12" cy="14" r="1.6" />
  </I>
);
export const IconCheck = (p: { size?: number }) => (
  <I {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </I>
);
export const IconMenu = (p: { size?: number }) => (
  <I {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </I>
);
export const IconClose = (p: { size?: number }) => (
  <I {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </I>
);
export const IconHome = (p: { size?: number }) => (
  <I {...p}>
    <path d="M3 11l9-7 9 7" />
    <path d="M5 10v10h14V10" />
  </I>
);
export const IconChart = (p: { size?: number }) => (
  <I {...p}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </I>
);
export const IconMore = (p: { size?: number }) => (
  <I {...p}>
    <circle cx="5" cy="12" r="1.2" />
    <circle cx="12" cy="12" r="1.2" />
    <circle cx="19" cy="12" r="1.2" />
  </I>
);
export const IconCamera = (p: { size?: number }) => (
  <I {...p}>
    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
    <circle cx="12" cy="13" r="3.5" />
  </I>
);
export const IconWarn = (p: { size?: number }) => (
  <I {...p}>
    <path d="M12 3l9.5 17h-19z" />
    <path d="M12 10v4M12 17.5v.5" />
  </I>
);
