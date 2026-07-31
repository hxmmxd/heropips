import Link from "next/link";
import { Card } from "@heropips/ui";

/**
 * Canonical early-access positioning strip (server component, zero client JS).
 * One source of truth for the "built & live for founding members" message —
 * reuse everywhere; never fork the copy.
 *
 * `hideCta` drops the trailing /founding link. Pass it wherever the note sits
 * directly beneath a primary /founding button (the product heroes), so the
 * same call to action doesn't appear twice inside one decision point.
 */
export const EARLY_ACCESS_LINE =
  "HeroPips is in early access: the platform is built and live for Founding Hero lifetime members. Their feedback shapes what ships next — full public launch is coming.";

export function EarlyAccessNote({ compact = false, hideCta = false, style }: { compact?: boolean; hideCta?: boolean; style?: React.CSSProperties }) {
  return (
    <Card
      tone="volt"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: compact ? "10px 14px" : "14px 18px",
        fontSize: "var(--text-sm)",
        lineHeight: "var(--leading-body)",
        color: "var(--text-mid)",
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          flex: "none",
          width: 8,
          height: 8,
          marginTop: 5,
          borderRadius: "50%",
          background: "var(--volt-400)",
          boxShadow: "0 0 8px var(--volt-400)",
        }}
      />
      <span>
        {EARLY_ACCESS_LINE}
        {!hideCta && (
          <>
            {" "}
            <Link href="/founding" className="hp-arrow-link">
              Get instant access — $499 →
            </Link>
          </>
        )}
      </span>
    </Card>
  );
}
