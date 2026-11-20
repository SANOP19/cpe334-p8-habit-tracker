import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Lab 5 #37: on Cloud Run one container serves the API and the built React app
// on the same origin (one image, port 3000). Only in production; in development
// and tests the Vite dev server serves the client.

const SHELL = "<!doctype html><html><body>HabitPulse test shell</body></html>";

async function loadApp(env: Record<string, string>): Promise<Express> {
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  vi.resetModules();
  const mod = await import("../src/app.js");
  return mod.app;
}

describe("Built client served by Express in production", () => {
  let dir: string;
  let app: Express;

  beforeAll(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "habitpulse-client-"));
    fs.writeFileSync(path.join(dir, "index.html"), SHELL);
    fs.mkdirSync(path.join(dir, "assets"));
    fs.writeFileSync(path.join(dir, "assets", "app-123.js"), "console.log('app');");
    app = await loadApp({ NODE_ENV: "production", CLIENT_DIST_DIR: dir });
  });

  afterAll(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("GET / returns the client shell as HTML that browsers revalidate", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/html/);
    expect(res.text).toContain("HabitPulse test shell");
    expect(res.headers["cache-control"]).toMatch(/no-cache/);
  });

  it("a client-side route (deep link) also returns the shell", async () => {
    const res = await request(app).get("/goals/42");
    expect(res.status).toBe(200);
    expect(res.text).toContain("HabitPulse test shell");
  });

  it("built assets are served as files", async () => {
    const res = await request(app).get("/assets/app-123.js");
    expect(res.status).toBe(200);
    expect(res.text).toContain("console.log('app');");
  });

  it("unknown /api paths still return the JSON 404, not the shell", async () => {
    const res = await request(app).get("/api/unknown");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: "NOT_FOUND", message: "The requested resource was not found" },
    });
  });

  it("the API keeps working next to the client", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("Built client is not served outside production", () => {
  let dir: string;
  let app: Express;

  beforeAll(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "habitpulse-client-"));
    fs.writeFileSync(path.join(dir, "index.html"), SHELL);
    app = await loadApp({ NODE_ENV: "test", CLIENT_DIST_DIR: dir });
  });

  afterAll(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("GET / returns the JSON 404", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
