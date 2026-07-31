import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Space_Grotesk, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/pwa/PwaRegister";
import { Analytics } from "@/components/analytics/Analytics";
import { ConsentBanner } from "@/components/analytics/ConsentBanner";
import { THEME_INIT } from "@/lib/security-headers";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--nf-display", display: "swap" });
const body = Instrument_Sans({ subsets: ["latin"], variable: "--nf-body", display: "swap" });
// Two deliberate choices, both measured:
//
//  - NO `weight` array. next/font ships a STATIC file per listed weight; the
//    variable axis is one file covering 100–800. Listing 400/500/600/700 put
//    four mono files on the wire where one does, and font bytes are what the
//    LCP text waits on under a throttled profile.
//  - `preload: false`. Next preloads every next/font by default, and three
//    competing <link rel=preload> fonts contend for the critical bandwidth the
//    LCP paragraph needs. Mono is never the LCP element — it renders eyebrows,
//    kickers, table units and the art labels. It still self-hosts, just off the
//    critical path, and `display: swap` paints those in the fallback meanwhile.
//
// Weight 700 is load-bearing regardless: the isometric art labels sit on shaded
// 3D solids, where 400/600 lacked the stem weight to stay legible.
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
  manifest: "/manifest.webmanifest",
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
