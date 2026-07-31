import { NextResponse } from "next/server";
import { UpstreamError } from "@/lib/api";

/* ---------- request body caps ----------
 * App Router route handlers have NO default body limit (the 4 MB Pages-API
 * `bodyParser.sizeLimit` does not apply), and zod only runs once the whole
 * body is buffered and parsed — a `.max(200)` field never stops a 500 MB
 * POST from being read into memory first. Every handler that calls
 * `req.json()` must therefore check the declared length BEFORE reading.
 *
 * A body with no declared length cannot be capped without buffering it, so
 * it is refused outright: every caller of this tier is our own `fetch`, and
 * fetch always sets Content-Length for a string body. */
export const BODY_LIMIT = {
  /** Credentials, orders, profile patches — all schema-bounded and small. */
  default: 16 * 1024,
  /** ChatPostReq caps the message at 2000 chars ⇒ ≤8 KiB of UTF-8. */
  chat: 8 * 1024,
  /** Affiliate applications: bounded fields, worst case ~7 KiB with a 1000-char note. */
  affiliate: 8 * 1024,
  /** Academy sync ships the device completions record (many lesson slugs). */
  academySync: 64 * 1024,
} as const;

/** Reject an oversized or unmeasurable JSON body before `req.json()` buffers it. */
export function bodyLimit(req: Request, maxBytes: number = BODY_LIMIT.default): NextResponse | null {
  const declared = req.headers.get("content-length");
  const length = declared === null ? Number.NaN : Number(declared);
  if (!Number.isInteger(length) || length < 0) {
    return NextResponse.json(
      {
        error_code: "validation_failed",
        message: "A Content-Length header is required.",
        remediation: "Send the payload as a single JSON body.",
      },
      { status: 411 },
    );
  }
  if (length > maxBytes) {
    return NextResponse.json(
      {
        error_code: "validation_failed",
        message: "Request body is too large.",
        remediation: "Shorten the submitted values and try again.",
      },
      { status: 413 },
    );
  }
  return null;
}

/* ---------- error mapping: upstream passthrough, everything else opaque ---------- */
export function toResponse(err: unknown): NextResponse {
  if (err instanceof UpstreamError) return NextResponse.json(err.body, { status: err.status });
  return NextResponse.json(
    { error_code: "internal", message: "Something went wrong.", remediation: "Try again shortly." },
    { status: 502 },
  );
}

export function validationFailed(detail: string): NextResponse {
  return NextResponse.json(
    { error_code: "validation_failed", message: detail, remediation: "Check the highlighted fields." },
    { status: 422 },
  );
}
