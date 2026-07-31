/* =========================================================================
 * Certificate share card — /academy/verify/[code]. Fetches growth directly
 * (internal service; no bearer) and degrades to a generic "verify a
 * certificate" card on any failure. Hex values mirror packages/ui/tokens.css.
 * ======================================================================= */

import { ImageResponse } from "next/og";
import { AcademyVerifyRes, type AcademyCertRes } from "@heropips/contracts";
import { TRACKS } from "@/lib/academy/curriculum";

export const alt = "Verified HeroPips Academy certificate";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#07080C"; // --ink-950
const VOLT = "#C6FF2E"; // --volt-500
const ON_VOLT = "#0D0F07"; // --on-volt
const TEXT = "#F3F5FA"; // --text-hi
const MID = "#9BA4B8"; // --text-mid
const PROFIT = "#21E88D"; // --profit-500

async function fetchCertificate(code: string): Promise<AcademyCertRes | null> {
  const growthUrl = process.env.GROWTH_URL ?? "http://localhost:4001";
  try {
    const res = await fetch(`${growthUrl}/v1/academy/certificates/verify/${encodeURIComponent(code)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const parsed = AcademyVerifyRes.safeParse(await res.json());
    if (!parsed.success || !parsed.data.valid) return null;
    return parsed.data.certificate;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const cert = await fetchCertificate(code);
  const trackName = cert ? TRACKS.find((t) => t.id === cert.track)?.name ?? "Academy" : null;
  const issued = cert
    ? new Date(cert.issued_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : null;
  const nameSize = cert ? (cert.recipient.length > 22 ? 56 : 76) : 76;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: INK,
          padding: "72px 80px",
          position: "relative",
        }}
      >
        {/* thin volt frame */}
        <div
          style={{
            position: "absolute",
            top: 24,
            left: 24,
            right: 24,
            bottom: 24,
            border: "1px solid rgba(198,255,46,0.45)", // --volt-500 @ 45%
            borderRadius: 12,
          }}
        />
        {/* oversized chevron watermark, half-cropped bottom-right */}
        <svg
          width="560"
          height="560"
          viewBox="0 0 32 32"
          style={{ position: "absolute", right: -150, bottom: -170, opacity: 0.08 }}
        >
          <path d="M8 19.5 16 12l8 7.5" stroke={VOLT} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 25 16 17.5 24 25" stroke={VOLT} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
        </svg>

        {/* wordmark row + seal */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <svg width="44" height="44" viewBox="0 0 32 32">
              <rect width="32" height="32" rx="8" fill={VOLT} />
              <path d="M8 19.5 16 12l8 7.5" stroke={ON_VOLT} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 25 16 17.5 24 25" stroke={ON_VOLT} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
            </svg>
            <div style={{ display: "flex", fontSize: 24, letterSpacing: 5, color: MID }}>HEROPIPS ACADEMY</div>
          </div>
          {cert ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 128,
                height: 128,
                borderRadius: 999,
                border: `2px solid ${PROFIT}`,
                color: PROFIT,
                fontSize: 20,
                letterSpacing: 3,
              }}
            >
              VERIFIED
            </div>
          ) : null}
        </div>

        {cert && trackName ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", fontSize: 24, letterSpacing: 6, color: MID }}>
              CERTIFICATE OF COMPLETION
            </div>
            <div style={{ display: "flex", fontSize: nameSize, fontWeight: 700, color: TEXT, letterSpacing: -1, maxWidth: 1000 }}>
              {cert.recipient}
            </div>
            <div style={{ display: "flex", fontSize: 38, color: VOLT }}>{trackName}</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", fontSize: 24, letterSpacing: 6, color: VOLT }}>
              VERIFY A CERTIFICATE
            </div>
            <div style={{ display: "flex", fontSize: 76, fontWeight: 700, color: TEXT, letterSpacing: -1 }}>
              Real code, real work.
            </div>
            <div style={{ display: "flex", fontSize: 34, color: MID, maxWidth: 900 }}>
              Every HeroPips Academy credential has a public code anyone can check.
            </div>
          </div>
        )}

        {cert && issued ? (
          <div style={{ display: "flex", gap: 16 }}>
            <div
              style={{
                display: "flex",
                border: "1px solid rgba(198,255,46,0.5)", // volt chip
                borderRadius: 999,
                padding: "10px 24px",
                fontSize: 24,
                letterSpacing: 2,
                color: VOLT,
              }}
            >
              {cert.code}
            </div>
            <div
              style={{
                display: "flex",
                border: "1px solid rgba(155,164,184,0.35)", // --text-mid chip
                borderRadius: 999,
                padding: "10px 24px",
                fontSize: 24,
                letterSpacing: 2,
                color: MID,
              }}
            >
              ISSUED {issued.toUpperCase()}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex" }} />
        )}

        {/* footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", width: 10, height: 10, borderRadius: 999, background: VOLT }} />
          <div style={{ display: "flex", fontSize: 22, letterSpacing: 2, color: MID }}>heropips.com/academy</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
