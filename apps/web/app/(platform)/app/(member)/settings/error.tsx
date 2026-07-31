"use client";

import { ErrorState } from "@/components/app/ErrorState";

export default function SettingsError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState reset={reset} what="settings" />;
}
