"use client";

import { ErrorState } from "@/components/app/ErrorState";

export default function SecurityError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState reset={reset} what="security settings" />;
}
