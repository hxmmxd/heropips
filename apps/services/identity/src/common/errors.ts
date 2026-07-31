import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from "@nestjs/common";
import type { ErrorCode } from "@heropips/contracts";

/** HttpException whose body is the contracts ApiError shape verbatim. */
export class ApiException extends HttpException {
  constructor(status: number, code: ErrorCode, message: string, remediation?: string) {
    super(
      remediation
        ? { error_code: code, message, remediation }
        : { error_code: code, message },
      status,
    );
  }
}

/** Every error leaves this service as an ApiError body — internals never surface. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    // Fastify reply — typed structurally to avoid a direct fastify dependency.
    const reply = host
      .switchToHttp()
      .getResponse<{ status(code: number): { send(body: unknown): unknown } }>();

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      const body =
        typeof res === "object" && res !== null && "error_code" in res
          ? res
          : { error_code: "internal", message: exception.message };
      reply.status(exception.getStatus()).send(body);
      return;
    }

    // eslint-disable-next-line no-console
    console.error("[identity] unhandled error", exception);
    reply.status(500).send({ error_code: "internal", message: "Unexpected error." });
  }
}
