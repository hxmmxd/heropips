import { describe, expect, it } from "vitest";
import { effectivePosition, jumpsFor, maskEmail } from "../src/common/position";

describe("position math (3 referrals per jump, 25 positions per jump)", () => {
  it("no referrals -> base position", () => {
    expect(effectivePosition(100, 0)).toBe(100);
    expect(effectivePosition(1, 0)).toBe(1);
  });

  it("partial jumps do not count", () => {
    expect(effectivePosition(100, 1)).toBe(100);
    expect(effectivePosition(100, 2)).toBe(100);
    expect(effectivePosition(100, 5)).toBe(75); // 1 jump, not 1.66
  });

  it("each completed jump moves 25 positions", () => {
    expect(effectivePosition(100, 3)).toBe(75);
    expect(effectivePosition(100, 6)).toBe(50);
    expect(effectivePosition(100, 9)).toBe(25);
  });

  it("floors at position 1", () => {
    expect(effectivePosition(100, 12)).toBe(1); // 100 - 100
    expect(effectivePosition(10, 3)).toBe(1); // 10 - 25
    expect(effectivePosition(2, 300)).toBe(1);
  });

  it("jumpsFor floors the division", () => {
    expect(jumpsFor(0)).toBe(0);
    expect(jumpsFor(2)).toBe(0);
    expect(jumpsFor(3)).toBe(1);
    expect(jumpsFor(8)).toBe(2);
  });
});

describe("email masking", () => {
  it("masks like o•••@g•••.com", () => {
    expect(maskEmail("osama@gmail.com")).toBe("o•••@g•••.com");
    expect(maskEmail("hero@proton.me")).toBe("h•••@p•••.me");
  });

  it("keeps only the last label as tld for multi-label domains", () => {
    expect(maskEmail("a@mail.co.uk")).toBe("a•••@m•••.uk");
  });

  it("does not crash on degenerate input", () => {
    expect(maskEmail("a@b")).toBe("a•••@b•••");
    expect(maskEmail("x")).toBe("x•••@•••");
  });
});
