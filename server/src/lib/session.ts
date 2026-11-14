import { randomBytes, createHash } from "node:crypto";
import type { CookieOptions } from "express";
import { prisma } from "./prisma.js";
import { clock } from "./clock.js";

// Server-side sessions (decision D-11, SDS §3, F-01 contract §1.2).
// The random token only ever travels in the HttpOnly cookie; the database stores its SHA-256 hash.

export const SESSION_COOKIE = "session";

export type Role = "PARTICIPANT" | "PROGRAM_MANAGER";
export interface PublicUser {
  id: number;
  email: string;
  displayName: string;
  role: Role;
}

export function toPublicUser(user: { id: number; email: string; displayName: string; role: Role }): PublicUser {
  return { id: user.id, email: user.email, displayName: user.displayName, role: user.role };
}

export function sessionTtlHours(): number {
  const hours = Number(process.env.SESSION_TTL_HOURS ?? 24);
  return Number.isFinite(hours) && hours > 0 ? hours : 24;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function sessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionTtlHours() * 3600 * 1000, // Express takes milliseconds; header shows seconds
  };
}

export function clearedCookieOptions(): CookieOptions {
  const { maxAge: _ignored, ...rest } = sessionCookieOptions();
  return rest;
}

export async function createSession(userId: number): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(clock.now().getTime() + sessionTtlHours() * 3600 * 1000);
  await prisma.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt } });
  return { token, expiresAt };
}

/** Returns the session's user, or null if the token is unknown or expired (an expired session is deleted). */
export async function findSessionUser(token: string): Promise<PublicUser | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= clock.now().getTime()) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    return null;
  }
  return toPublicUser(session.user);
}

export async function deleteSession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}
