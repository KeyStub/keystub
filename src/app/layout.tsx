import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { APP_NAME, TAGLINE } from "@/lib/brand";
import "./globals.css";

// Brand fonts are bundled in src/fonts (SIL Open Font License) so builds never depend on Google Fonts.
const display = localFont({
  src: [
    { path: "../fonts/archivo-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "../fonts/archivo-latin-800-normal.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-display",
  display: "swap",
});
const body = localFont({
  src: [
    { path: "../fonts/ibm-plex-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/ibm-plex-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../fonts/ibm-plex-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: { default: `${APP_NAME}: ${TAGLINE}`, template: `%s · ${APP_NAME}` },
  description:
    "Track fuel, maintenance, insurance and registration for every vehicle you own. See your true cost of ownership, cost per km, and what's due next.",
  applicationName: APP_NAME,
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "default" },
  openGraph: { siteName: APP_NAME, type: "website", locale: "en_CA" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#18263F" },
    { media: "(prefers-color-scheme: dark)", color: "#0E141F" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-CA" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        {/* Apply the saved light/dark choice before first paint (no flash). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
