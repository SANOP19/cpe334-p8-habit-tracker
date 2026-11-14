import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const statusCode = err.statusCode || (err.status ? Number(err.status) : 500);
  const code = err.code || "INTERNAL_ERROR";
  const message =
    statusCode === 500
      ? "Internal server error"
      : err.message || "An unexpected error occurred";

  res.status(statusCode).json({
    error: {
      code,
      message,
    },
  });
}
