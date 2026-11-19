import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/error-handler.js";
import { authRouter } from "./routes/auth.js";
import { templatesRouter } from "./routes/templates.js";
import { goalsRouter } from "./routes/goals.js";
import { prisma } from "./lib/prisma.js";
import { serveClient, shouldServeClient } from "./lib/client-static.js";

export const app = express();

// Restrict CORS to client development server (same-origin proxy used in production)
const allowedOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];
app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps or curl)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());

// Health check endpoint (Issue #3)
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Readiness probe (Lab 5 #37): proves the API can reach the database.
// Used by the post-deploy smoke test; public and read-only.
app.get("/api/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ready", db: "connected" });
  } catch {
    res.status(503).json({ status: "not_ready" });
  }
});

// F-01 Authentication and session
app.use("/api/auth", authRouter);

// F-02 Activity template management
app.use("/api/templates", templatesRouter);

// F-03 Goal setting
app.use("/api/goals", goalsRouter);

// Test route to verify unexpected error handling in test environment
if (process.env.NODE_ENV === "test") {
  app.get("/api/test/unexpected-error", (_req, _res, _next) => {
    throw new Error("Simulated unhandled database failure");
  });
}

// Production only (Lab 5 #37): serve the built client from the same container.
if (shouldServeClient()) {
  serveClient(app);
}

// 404 handler for unknown routes
app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "The requested resource was not found",
    },
  });
});

// Centralized error handler using §8 shape and NFR-05 safe logging
app.use(errorHandler);
