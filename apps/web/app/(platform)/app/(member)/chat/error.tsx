"use client";

import { ErrorState } from "@/components/app/ErrorState";

export default function ChatError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState reset={reset} what="the lounge" />;
}
