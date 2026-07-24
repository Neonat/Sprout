import type { MetadataRoute } from "next";

/**
 * PWA manifest. Next serves this at /manifest.webmanifest.
 *
 * Note iOS reads almost none of this for installation — it uses the
 * apple-touch-icon and apple-web-app meta tags in the root layout instead.
 * This is what makes Android/Chromium offer an install prompt.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Plantemon",
    short_name: "Plantemon",
    description: "Scan real plants, turn them into creatures, and battle with them.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#203727",
    categories: ["games", "education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
