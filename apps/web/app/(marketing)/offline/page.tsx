import type { Metadata } from "next";
import { ButtonLink, Card, Kicker, LevelUpMark } from "@heropips/ui";
import { Reconnect } from "./Reconnect";

export const metadata: Metadata = {
  title: "Offline",
  description: "You appear to be offline. HeroPips will be here when you reconnect.",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <div className="container section" style={{ display: "flex", justifyContent: "center" }}>
      <Card raised style={{ maxWidth: 480, width: "100%", padding: 40, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <LevelUpMark size={44} />
        </div>
        <Kicker style={{ marginBottom: 12 }}>offline · connection lost</Kicker>
        <h1 style={{ fontSize: "var(--text-3xl)", marginBottom: 12 }}>You&apos;re offline</h1>
        <p style={{ color: "var(--text-mid)", marginBottom: 8 }}>
          No connection detected. Markets keep moving — this page doesn&apos;t have to.
        </p>
        <p style={{ color: "var(--text-mid)", fontSize: "var(--text-sm)", marginBottom: 24 }}>
          Pages you&apos;ve already visited still work offline — and this one reloads
          by itself the moment you&apos;re back.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Reconnect />
          <ButtonLink href="/" variant="ghost">Back home</ButtonLink>
        </div>
      </Card>
    </div>
  );
}
