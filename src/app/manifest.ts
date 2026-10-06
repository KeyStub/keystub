import type { MetadataRoute } from "next";
import { APP_NAME, TAGLINE } from "@/lib/brand";

/** Makes the app installable ("Add to Home Screen") with the KeyStub icon. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: TAGLINE,
    start_url: "/app",
    display: "standalone",
    background_color: "#18263F",
    theme_color: "#18263F",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
