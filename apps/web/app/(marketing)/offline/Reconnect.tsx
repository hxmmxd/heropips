"use client";

import * as React from "react";
import { Button } from "@heropips/ui";

/** Retry CTA that also reloads by itself the moment connectivity returns. */
export function Reconnect() {
  React.useEffect(() => {
    const onOnline = () => window.location.reload();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);
  return (
    <Button onClick={() => window.location.reload()} style={{ minWidth: 160 }}>
      Try again
    </Button>
  );
}
