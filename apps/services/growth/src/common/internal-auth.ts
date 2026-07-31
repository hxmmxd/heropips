import { timingSafeEqual } from "node:crypto";
import { SetMetadata, type CanActivate, type ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import type { GrowthConfig } from "./config";
import { apiError } from "./errors";
import type { HttpRequest } from "./http";

/** Header the web BFF (and any sibling service) presents on internal routes. */
export const INTERNAL_TOKEN_HEADER = "x-hp-internal-token";

export const INTERNAL_ONLY_METADATA = "hp:internal-only";

/**
 * Mark a handler as internal-only (H4). These routes take the acting identity
 * from the request body, so the caller — not the body — has to be trusted.
 */
export const InternalOnly = (): MethodDecorator => SetMetadata(INTERNAL_ONLY_METADATA, true);

/** Constant-time compare, mirroring common/token.ts and common/verification.ts. */
function tokenMatches(presented: string, expected: string): boolean {
  const a = Buffer.from(presented, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Requires INTERNAL_SVC_TOKEN on every @InternalOnly() handler. When the config
 * value is null the guard allows the call: `loadConfig` already refuses to boot
 * without it in production, so a null here means dev/test only.
 */
export class InternalAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: GrowthConfig,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.internalToken;
    if (expected === null) return true;
    const internal = this.reflector.get<boolean | undefined>(
      INTERNAL_ONLY_METADATA,
      context.getHandler(),
    );
    if (internal !== true) return true;

    const req = context.switchToHttp().getRequest<HttpRequest>();
    const header = req.headers[INTERNAL_TOKEN_HEADER];
    const presented = Array.isArray(header) ? header[0] : header;
    if (presented === undefined || !tokenMatches(presented, expected)) {
      throw apiError(
        401,
        "unauthorized",
        "This endpoint is internal.",
        "Call it through the HeroPips app, not directly.",
      );
    }
    return true;
  }
}
