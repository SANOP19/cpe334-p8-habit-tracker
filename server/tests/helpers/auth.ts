import bcrypt from "bcryptjs";
import type { Response } from "supertest";
import { prisma } from "../../src/lib/prisma.js";

// Low bcrypt cost keeps tests fast; production hashing (seed) uses cost 10.
export async function createUser(opts: {
  email: string;
  password: string;
  role: "PARTICIPANT" | "PROGRAM_MANAGER";
  displayName?: string;
}) {
  return prisma.user.create({
    data: {
      email: opts.email,
      passwordHash: await bcrypt.hash(opts.password, 4),
      displayName: opts.displayName ?? opts.email.split("@")[0],
      role: opts.role,
    },
  });
}

/** Returns the raw `session=...` cookie pair from a response, or undefined. */
export function sessionCookie(res: Response): string | undefined {
  const header = res.headers["set-cookie"] as unknown as string[] | undefined;
  const line = header?.find((c) => c.startsWith("session="));
  return line?.split(";")[0];
}

export function sessionCookieLine(res: Response): string | undefined {
  const header = res.headers["set-cookie"] as unknown as string[] | undefined;
  return header?.find((c) => c.startsWith("session="));
}

/** Token value from a `session=<token>` pair. */
export function tokenOf(cookie: string): string {
  return cookie.slice("session=".length);
}
