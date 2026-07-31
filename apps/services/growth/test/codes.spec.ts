import { describe, expect, it } from "vitest";
import { CODE_ALPHABET, CODE_LENGTH, generateReferralCode } from "../src/common/codes";

describe("referral codes", () => {
  it("alphabet excludes ambiguous glyphs I, O, 0, 1", () => {
    for (const ch of "IO01") expect(CODE_ALPHABET).not.toContain(ch);
    expect(CODE_ALPHABET).toHaveLength(32);
  });

  it("generates 8-char codes drawn only from the alphabet", () => {
    for (let i = 0; i < 500; i++) {
      const code = generateReferralCode();
      expect(code).toHaveLength(CODE_LENGTH);
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    }
  });

  it("honors a custom length", () => {
    expect(generateReferralCode(12)).toHaveLength(12);
  });

  it("does not produce a constant value", () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateReferralCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});
