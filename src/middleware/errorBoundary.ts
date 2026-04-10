import { Request, Response, NextFunction } from "express";
import { AppError } from "../types/errors.js";

export function errorBoundary(
  error: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
): void {
  const statusCode = error instanceof AppError ? error.statusCode : 500;

  res.status(statusCode).json({
    success: false,
    error: {
      message:
        error instanceof AppError ? error.message : "Internal Server Error",
      code: error.name || "Error",
    },
  });
}
