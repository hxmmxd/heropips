import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "HeroPips — decision intelligence, guarded execution",
    short_name: "HeroPips",
    lang: "en",
    dir: "ltr",
    description:
      "Decision intelligence from an internal quant engine, executed on your own broker behind Trade Guard risk controls. Self-directed software — no advice, no custody.",
    // Installed app opens the member surface; logged-out users land on login.
    start_url: "/app",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    // Dashboard and academy both read fine either way — do not lock the device.
    orientation: "any",
    theme_color: "#07080C",
    background_color: "#07080C",
    categories: ["finance", "education", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    shortcuts: [
      { name: "Intelligence", url: "/app/intelligence", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Positions", url: "/app/positions", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
      { name: "Founding Lounge", url: "/app/chat", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
