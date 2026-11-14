import type { Request, Response, NextFunction } from "express";

// Stub: implemented after the failing tests are recorded (F-01).
export type Role = "PARTICIPANT" | "PROGRAM_MANAGER";

export function requireAuth(_req: Request, _res: Response, next: NextFunction) {
  next();
}

export function requireRole(..._roles: Role[]) {
  return (_req: Request, _res: Response, next: NextFunction) => next();
}
