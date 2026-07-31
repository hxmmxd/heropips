import Link from "next/link";
import { LevelUpMark } from "@heropips/ui";

/**
 * The one heropips lockup: chevron mark + lowercase wordmark, always a link
 * home. Mounted by the marketing nav and by the member auth screens, which
 * are otherwise a dead end with no route back to the site.
 *
 * Styling lives in components/chrome/chrome.css (`.hp-brand`) so both mounts
 * share one set of rules — size, weight and casing included.
 */
export function BrandLockup({ size = 28 }: { size?: number }) {
  return (
    <Link href="/" aria-label="HeroPips home" className="hp-brand">
      <LevelUpMark size={size} />
      <span className="hp-brand-word">heropips</span>
    </Link>
  );
}
