import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Space_Grotesk, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "@heropips/ui/tokens.css";
import "@heropips/ui/brand.css";
import "@heropips/ui/loaders.css";
import "@heropips/ui/ui.css";
import "@/components/chrome/chrome.css";
import "@/components/art/art.css";
import "./globals.css";
import { PwaRegister } from "@/components/pwa/PwaRegister";
import { Analytics } from "@/components/analytics/Analytics";
import { ConsentBanner } from "@/components/analytics/ConsentBanner";
import { THEME_INIT } from "@/lib/security-headers";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--nf-display", display: "swap" });
const body = Instrument_Sans({ subsets: ["latin"], variable: "--nf-body", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--nf-mono", display: "swap", preload: false });

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://heropips.com";

// THEME_INIT lives in lib/security-headers.ts beside the CSP hash that allows
// it, so the script and its hash can never drift apart.

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "HeroPips — Decision intelligence. Your broker. On rails.", template: "%s · HeroPips" },
  description:
    "HeroPips is a trading intelligence platform: scored, explained decision intelligence, executed on your broker — MT5, Binance, KuCoin — under enforced rules.",
  applicationName: "HeroPips",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "HeroPips" },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192.png" },
    ],
  },
  openGraph: {
    type: "website", siteName: "HeroPips", url: SITE,
    title: "HeroPips — Decision intelligence. Your broker. On rails.",
    description: "HeroPips is a trading intelligence platform: scored, explained decision intelligence, executed on your broker — MT5, Binance, KuCoin — under enforced rules.",
    images: [{ url: "/media/hero-poster.jpg", width: 1600, height: 900, alt: "HeroPips — decision intelligence, simulated output" }],
  },
  twitter: { card: "summary_large_image", site: "@heropips" },
  robots: { index: true, follow: true },
};

const THEME_COLORS = { dark: "#07080C", light: "#F5F6F1" } as const;

export async function generateViewport(): Promise<Viewport> {
  const themeCookie = (await cookies()).get("hp_theme")?.value;
  const explicit = themeCookie === "light" || themeCookie === "dark" ? themeCookie : undefined;
  return {
    // Explicit choice pins one color; otherwise media-gated pair follows the OS.
    themeColor: explicit
      ? THEME_COLORS[explicit]
      : [
          { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.dark },
          { media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
        ],
    width: "device-width",
    initialScale: 1,
    // Draw under notches/home indicator; chrome offsets via env(safe-area-inset-*).
    viewportFit: "cover",
    // Android: soft keyboard resizes the layout viewport (keeps the chat
    // composer and sheet CTAs visible while typing).
    interactiveWidget: "resizes-content",
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const themeCookie = (await cookies()).get("hp_theme")?.value;
  const resolved = themeCookie === "light" || themeCookie === "dark" ? themeCookie : undefined;
  return (
    <html
      lang="en"
      data-theme={resolved ?? "dark"}
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body style={{
        ["--font-display" as string]: "var(--nf-display), 'Helvetica Neue', sans-serif",
        ["--font-body" as string]: "var(--nf-body), 'Helvetica Neue', sans-serif",
        ["--font-mono" as string]: "var(--nf-mono), 'SF Mono', monospace",
      }}>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        {children}
        <PwaRegister />
        <Analytics />
        <ConsentBanner />
      </body>
    </html>
  );
}
