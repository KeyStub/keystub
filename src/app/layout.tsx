import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Sans } from "next/font/google";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { APP_NAME, TAGLINE } from "@/lib/brand";
import "./globals.css";

const display = Archivo({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-display" });
const body = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" });

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
