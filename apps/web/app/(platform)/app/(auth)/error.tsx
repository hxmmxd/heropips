"use client";

import { Button, Kicker } from "@heropips/ui";

/* Rendered inside (auth)/layout.tsx, so the brand bar — and with it the route
 * back to the marketing site — survives the failure. */
export default function AuthError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="ap-auth-card" role="alert">
      <div className="ap-auth-head">
        <Kicker>auth · unreachable</Kicker>
        <h1 className="ap-auth-title">Something broke</h1>
        <p className="ap-auth-lede">Couldn&apos;t reach the sign-in service. Try again in a moment.</p>
      </div>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
