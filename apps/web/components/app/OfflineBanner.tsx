"use client";

import * as React from "react";

/**
 * Connectivity strip for the member shell. Data on screen is server-rendered
 * ("as of" timestamps), so offline = last synced — say exactly that.
 */
export function OfflineBanner() {
  const [offline, setOffline] = React.useState(false);
  React.useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  if (!offline) return null;
  return (
    <div className="ap-offline" role="status">
      Offline — showing last synced data. Live prices and orders resume when you reconnect.
    </div>
  );
}
