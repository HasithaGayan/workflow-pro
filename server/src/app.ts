
import express from "express";
import { randomUUID } from "node:crypto";

import { taskRoutes } from "./routes/taskRoutes";

import {
  workspaceRoutes,
  projectRoutes,
} from "./routes/teamRoutes";

import { authRoutes } from "./routes/authRoutes";

import {
  requireLogin,
  secureWorkspaces,
  secureProjects,
  secureTasks,
} from "./middleware/accessControl";

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

// Public health endpoint
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "WorkFlow Pro API is running",
  });
});

// Day 46: public registration/login,
// authenticated profile and logout.
app.use("/api/auth", authRoutes);

// Day 47: all business routes require login
// and resource-specific authorization.
app.use(
  "/api/tasks",
  requireLogin,
  secureTasks,
  taskRoutes
);

app.use(
  "/api/workspaces",
  requireLogin,
  secureWorkspaces,
  workspaceRoutes
);

app.use(
  "/api/projects",
  requireLogin,
  secureProjects,
  projectRoutes
);

// Unknown routes
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

// Central error handler
app.use(errorHandler);
