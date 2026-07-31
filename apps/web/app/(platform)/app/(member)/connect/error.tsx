"use client";

import { ErrorState } from "@/components/app/ErrorState";

export default function ConnectError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState reset={reset} what="connections" />;
}
