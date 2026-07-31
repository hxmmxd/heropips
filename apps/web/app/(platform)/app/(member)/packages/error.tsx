"use client";

import { ErrorState } from "@/components/app/ErrorState";

export default function PackagesError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState reset={reset} what="your package" />;
}
