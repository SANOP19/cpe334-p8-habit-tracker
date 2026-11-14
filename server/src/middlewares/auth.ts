import type { Request, Response, NextFunction } from "express";
import { AppError } from "./error-handler.js";
import {
  SESSION_COOKIE,
  clearedCookieOptions,
  findSessionUser,
  type PublicUser,
  type Role,
} from "../lib/session.js";

export type { Role };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: PublicUser;
      sessionToken?: string;
    }
  }
}

const unauthenticated = () => new AppError(401, "UNAUTHENTICATED", "Please sign in.");

/** Step 1 of the order of checks (SDS §5.3): a valid, unexpired session is required. */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    if (typeof token !== "string" || token.length === 0) return next(unauthenticated());

    const user = await findSessionUser(token);
    if (!user) {
      res.clearCookie(SESSION_COOKIE, clearedCookieOptions());
      return next(unauthenticated());
    }
    req.user = user;
    req.sessionToken = token;
    return next();
  } catch (err) {
    return next(err);
  }
}

/** Step 2 of the order of checks: the signed-in user's role must be one of `roles`. Use after requireAuth. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthenticated());
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, "FORBIDDEN", "You do not have permission to do this."));
    }
    return next();
  };
}
