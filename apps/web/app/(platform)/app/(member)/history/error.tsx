"use client";

import { ErrorState } from "@/components/app/ErrorState";

export default function HistoryError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState reset={reset} what="trade history" />;
}
