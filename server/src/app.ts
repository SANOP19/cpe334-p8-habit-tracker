import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/error-handler.js";

export const app = express();

app.use(cors());
app.use(cookieParser());
app.use(express.json());

// Health check endpoint (Issue #3)
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// 404 handler for unknown routes
app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "The requested resource was not found",
    },
  });
});

// Centralized error handler using §8 shape
app.use(errorHandler);
