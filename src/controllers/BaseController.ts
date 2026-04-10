import * as Sentry from "@sentry/node";
import { Response } from "express";
import { AppError } from "../types/errors.js";

interface AppErrorLike {
  statusCode: number;
  name: string;
}

function isAppError(error: unknown): error is AppErrorLike {
  return (
    error !== null &&
    typeof error === "object" &&
    "statusCode" in error &&
    typeof (error as Record<string, unknown>).statusCode === "number"
  );
}

interface ErrorResponseBody {
  success: false;
  error: {
    message: string;
    code: string;
  };
}

interface SuccessResponseBody<T> {
  success: true;
  message?: string;
  data?: T;
}

export abstract class BaseController {
  protected handleError(
    error: unknown,
    res: Response,
    context: string,
    defaultStatusCode = 500,
  ): void {
    const statusCode = isAppError(error) ? error.statusCode : defaultStatusCode;

    if (statusCode >= 500) {
      Sentry.withScope((scope) => {
        scope.setTag("controller", this.constructor.name);
        scope.setTag("operation", context);
        if (error instanceof Error) {
          scope.setContext("error_details", {
            message: error.message,
            stack: error.stack,
          });
        }
        Sentry.captureException(error);
      });
    }

    const body: ErrorResponseBody = {
      success: false,
      error: {
        message:
          error instanceof AppError
            ? error.message
            : error instanceof Error
              ? error.message
              : "An error occurred",
        code: isAppError(error) ? error.name : "InternalError",
      },
    };

    res.status(statusCode).json(body);
  }

  protected handleSuccess<T>(
    res: Response,
    data?: T,
    message?: string,
    statusCode = 200,
  ): void {
    const payload: SuccessResponseBody<T> = { success: true };
    if (message) payload.message = message;
    if (data !== undefined) payload.data = data;
    res.status(statusCode).json(payload);
  }

  protected async withTransaction<T>(
    name: string,
    operation: string,
    callback: () => Promise<T>,
  ): Promise<T> {
    return Sentry.startSpan({ name, op: operation }, callback);
  }
}
