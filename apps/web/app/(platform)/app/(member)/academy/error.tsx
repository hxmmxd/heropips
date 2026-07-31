"use client";

import { ErrorState } from "@/components/app/ErrorState";

export default function AcademyError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState reset={reset} what="your academy progress" />;
}
