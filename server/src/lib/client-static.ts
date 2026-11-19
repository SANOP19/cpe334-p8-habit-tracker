import express, { type Express } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Lab 5 #37: in production one container serves the API and the built React app
// on the same origin, so the session cookie and relative /api calls keep working.
// Default location: <repo>/client/dist, two levels above this file's folder
// (src/lib or dist/lib). CLIENT_DIST_DIR overrides it (used by the tests).
const here = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CLIENT_DIST = path.resolve(here, "../../../client/dist");

export function clientDistDir(): string {
  return process.env.CLIENT_DIST_DIR || DEFAULT_CLIENT_DIST;
}

export function shouldServeClient(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Static files plus an SPA fallback for every GET that is not under /api. */
export function serveClient(app: Express, dir: string = clientDistDir()): void {
  const indexHtml = path.join(dir, "index.html");

  // Hashed assets can be cached; index.html must be revalidated so a new
  // release is visible without a hard refresh.
  app.use(
    express.static(dir, {
      index: false,
      setHeaders: (res, filePath) => {
        if (path.basename(filePath) === "index.html") res.setHeader("Cache-Control", "no-cache");
      },
    })
  );

  app.get(/^(?!\/api(?:\/|$)).*/, (_req, res, next) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(indexHtml, (err) => {
      if (err) next();
    });
  });
}
