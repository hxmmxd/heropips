import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { requireSameOrigin } from "./origin";

const SITE = "https://heropips.com";

function post(headers: Record<string, string>): Request {
  return new Request(`${SITE}/api/app/orders`, { method: "POST", headers });
}

describe("requireSameOrigin", () => {
  let previous: string | undefined;

  beforeEach(() => {
    previous = process.env.PUBLIC_ORIGIN;
    process.env.PUBLIC_ORIGIN = SITE;
  });

  afterEach(() => {
    if (previous === undefined) delete process.env.PUBLIC_ORIGIN;
    else process.env.PUBLIC_ORIGIN = previous;
  });

  it("allows a same-origin mutating request", () => {
    expect(requireSameOrigin(post({ "sec-fetch-site": "same-origin" }))).toBeNull();
  });

  it("allows a same-site mutating request", () => {
    expect(requireSameOrigin(post({ "sec-fetch-site": "same-site" }))).toBeNull();
  });

  it("denies a cross-site POST with 403 and an ApiError body", async () => {
    const res = requireSameOrigin(post({ "sec-fetch-site": "cross-site", origin: "https://evil.test" }));
    expect(res).not.toBeNull();
    expect(res?.status).toBe(403);
    await expect(res?.json()).resolves.toMatchObject({ error_code: "forbidden" });
  });

  it("denies a top-level cross-site form POST, which SameSite=Lax would allow", () => {
    // A third-party <form method=POST> navigation: Lax still sends the cookie,
    // but the browser reports cross-site and Origin is the attacker.
    const res = requireSameOrigin(
      post({ "sec-fetch-site": "cross-site", "sec-fetch-mode": "navigate", origin: "https://evil.test" }),
    );
    expect(res?.status).toBe(403);
  });

  it("denies Sec-Fetch-Site: none on a mutating request", () => {
    expect(requireSameOrigin(post({ "sec-fetch-site": "none" }))?.status).toBe(403);
  });

  it("allows Sec-Fetch-Site: none on a safe request", () => {
    const res = requireSameOrigin(new Request(`${SITE}/api/app/me`, { headers: { "sec-fetch-site": "none" } }));
    expect(res).toBeNull();
  });

  it("allows a missing Sec-Fetch-Site when Origin matches exactly", () => {
    expect(requireSameOrigin(post({ origin: SITE }))).toBeNull();
  });

  it("denies a missing Sec-Fetch-Site when Origin only prefix-matches", () => {
    expect(requireSameOrigin(post({ origin: "https://heropips.com.evil.test" }))?.status).toBe(403);
  });

  it("denies when both Sec-Fetch-Site and Origin are missing", () => {
    expect(requireSameOrigin(post({}))?.status).toBe(403);
  });

  it("falls back to the Host header when no origin env var is configured", () => {
    delete process.env.PUBLIC_ORIGIN;
    const configured = process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    try {
      const allowed = new Request("http://internal/api/app/orders", {
        method: "POST",
        headers: { origin: "https://heropips.com", host: "heropips.com", "x-forwarded-proto": "https" },
      });
      expect(requireSameOrigin(allowed)).toBeNull();
    } finally {
      if (configured !== undefined) process.env.NEXT_PUBLIC_SITE_URL = configured;
    }
  });
});
