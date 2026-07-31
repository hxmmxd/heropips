import type { Metadata } from "next";
import { ButtonLink, Kicker } from "@heropips/ui";
import { Nav } from "@/components/chrome/Nav";
import { Footer } from "@/components/chrome/Footer";
import { LostArt } from "@/components/art/Art";

/**
 * Global 404. It lives at the route root, outside `(marketing)`, so it never
 * inherits that group's layout — the chrome is rendered here explicitly.
 * Without it the page shipped two outbound links total and no skip link,
 * no `<main>` and no nav for a crawler that lands on a dead URL.
 */
export const metadata: Metadata = {
  title: "Page not found",
  description:
    "That HeroPips URL doesn't exist. Jump back to the platform overview, the academy or the early access list.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <Nav />
      <main id="main">
        <div className="container section" style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
          <div style={{ textAlign: "center", maxWidth: 560 }}>
            <LostArt style={{ maxWidth: 460, margin: "0 auto 8px" }} />
            <Kicker style={{ marginBottom: 12 }}>404 · not found</Kicker>
            <h1 style={{ fontSize: "clamp(31px, 5vw, var(--text-5xl))", marginBottom: 16 }}>
              This page never printed.
            </h1>
            <p style={{ color: "var(--text-mid)", marginBottom: 32 }}>
              The URL you followed doesn&apos;t exist — or hasn&apos;t unlocked yet.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <ButtonLink href="/" variant="volt">Back home</ButtonLink>
              <ButtonLink href="/early-access" variant="ghost">Join the free launch list</ButtonLink>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
