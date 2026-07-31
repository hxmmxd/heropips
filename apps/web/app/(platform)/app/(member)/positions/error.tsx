"use client";

import { ErrorState } from "@/components/app/ErrorState";

export default function PositionsError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState reset={reset} what="positions" />;
}
