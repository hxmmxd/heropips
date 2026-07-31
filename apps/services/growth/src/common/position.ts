import { JUMP_SIZE, REFERRALS_PER_JUMP } from "@heropips/contracts";

/** Completed queue jumps earned from verified referrals. */
export function jumpsFor(referralsVerified: number): number {
  return Math.floor(referralsVerified / REFERRALS_PER_JUMP);
}

/** Effective queue position: base minus earned jumps, floored at 1. */
export function effectivePosition(basePosition: number, referralsVerified: number): number {
  return Math.max(1, basePosition - jumpsFor(referralsVerified) * JUMP_SIZE);
}

/** "osama@gmail.com" -> "o•••@g•••.com" */
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  const local = at > 0 ? email.slice(0, at) : email;
  const domain = at > 0 ? email.slice(at + 1) : "";
  const labels = domain.split(".").filter((l) => l.length > 0);
  const tld = labels.length > 1 ? `.${labels[labels.length - 1]}` : "";
  const domainFirst = labels.length > 0 ? labels[0][0] : "";
  return `${local[0] ?? ""}•••@${domainFirst}•••${tld}`;
}
