import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middlewares/error-handler.js";
import { requireAuth } from "../middlewares/auth.js";
import {
  SESSION_COOKIE,
  clearedCookieOptions,
  createSession,
  deleteSession,
  sessionCookieOptions,
  toPublicUser,
} from "../lib/session.js";

// F-01 Authentication and session — docs/sprints/sprint-1/F-01-auth.md
export const authRouter = Router();

// Compared against when the email is unknown, so both failure cases take similar time.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

const invalidCredentials = () =>
  new AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");

authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = (req.body ?? {}) as { email?: unknown; password?: unknown };
    const details: Array<{ field: string; message: string }> = [];
    if (typeof email !== "string" || email.trim() === "") details.push({ field: "email", message: "Required" });
    if (typeof password !== "string" || password === "") details.push({ field: "password", message: "Required" });
    if (details.length > 0) {
      throw new AppError(422, "VALIDATION_ERROR", "Email and password are required.", details);
    }

    const user = await prisma.user.findUnique({
      where: { email: (email as string).trim().toLowerCase() },
    });
    const passwordMatches = await bcrypt.compare(password as string, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !passwordMatches) throw invalidCredentials();

    const { token } = await createSession(user.id);
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
    res.status(200).json({ user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.status(200).json({ user: req.user });
});

authRouter.post("/logout", requireAuth, async (req, res, next) => {
  try {
    await deleteSession(req.sessionToken!);
    res.clearCookie(SESSION_COOKIE, clearedCookieOptions());
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
