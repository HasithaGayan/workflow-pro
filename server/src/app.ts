
import express from "express";
import { randomUUID } from "node:crypto";

import { taskRoutes } from "./routes/taskRoutes";

import {
  workspaceRoutes,
  projectRoutes,
} from "./routes/teamRoutes";

import { authRoutes } from "./routes/authRoutes";

import { errorHandler } from "./middleware/errorHandler";

export const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "10kb" }));

app.use((req, res, next) => {
  const requestId = randomUUID();
  const started = Date.now();

  res.setHeader("X-Request-ID", requestId);

  res.on("finish", () => {
    console.log({
      requestId,
      method: req.method,
      path: req.originalUrl.split("?")[0],
      status: res.statusCode,
      durationMs: Date.now() - started,
    });
  });

  next();
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "WorkFlow Pro API is running",
  });
});

// Existing Day 41–45 routes
app.use("/api/tasks", taskRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/projects", projectRoutes);

// Day 46 — Authentication
app.use("/api/auth", authRoutes);

// Unknown route
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

// Existing error handler
app.use(errorHandler);
