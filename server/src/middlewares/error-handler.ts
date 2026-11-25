import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Array<{ field?: string; message: string }>
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
  // A body over the express.json limit (100 KB) is a client error, not a server error (Lab 6 KI-2, #60)
  if (err && err.type === "entity.too.large") {
    return res.status(413).json({
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "The request is too large.",
      },
    });
  }

  // Handle JSON parse errors from express.json()
  if (err instanceof SyntaxError && "status" in err && err.status === 400 && "body" in err) {
    return res.status(422).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Malformed JSON payload in request body",
      },
    });
  }

  // Handle expected application domain errors
  if (err instanceof AppError) {
    const errorPayload: { code: string; message: string; details?: Array<{ field?: string; message: string }> } = {
      code: err.code,
      message: err.message,
    };
    if (err.details && err.details.length > 0) {
      errorPayload.details = err.details;
    }
    return res.status(err.statusCode).json({ error: errorPayload });
  }

  // Handle unexpected internal server errors (NFR-05)
  // Log real error on the server for diagnostics
  console.error("Internal Server Error:", err);

  // Return generic safe response without leaking internal codes (e.g. P2002), stack traces, or SQL
  return res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong. Please try again.",
    },
  });
}
