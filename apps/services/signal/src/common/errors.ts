import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from "@nestjs/common";
import type { ZodError } from "zod";
import type { ApiError, ErrorCode } from "@heropips/contracts";

/** Minimal Fastify reply surface (fastify is a transitive dep; avoid direct type import). */
interface ReplyLike {
  status(code: number): ReplyLike;
  send(body: unknown): unknown;
}

/** Contract-shaped HTTP error. Raw provider/internal errors never surface. */
export class ApiHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiError,
  ) {
    super(body.message);
  }
}

export function apiError(
  status: number,
  error_code: ErrorCode,
  message: string,
  remediation?: string,
): ApiHttpError {
  return new ApiHttpError(status, { error_code, message, ...(remediation ? { remediation } : {}) });
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("http");

  catch(exception: unknown, host: ArgumentsHost): void {
    const reply = host.switchToHttp().getResponse<ReplyLike>();

    if (exception instanceof ApiHttpError) {
      void reply.status(exception.status).send(exception.body);
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body: ApiError =
        status === 404
          ? { error_code: "internal", message: "Not found." }
          : { error_code: "internal", message: "Unexpected error." };
      void reply.status(status).send(body);
      return;
    }

    this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception));
    void reply.status(500).send({ error_code: "internal", message: "Unexpected error." } satisfies ApiError);
  }
}

/** Compact human-readable summary of zod validation issues. */
export function zodDetails(error: ZodError): string {
  return error.issues
    .slice(0, 3)
    .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
    .join("; ");
}
