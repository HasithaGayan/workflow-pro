
import express from "express";
import { randomUUID } from "node:crypto";
import helmet from "helmet";

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

import {
  loginLimiter,
  registrationLimiter,
  verifyRequestOrigin,
} from "./middleware/securityGuards";

import {
  issueCsrfToken,
  requireCsrf,
} from "./middleware/csrfProtection";

import { errorHandler } from "./middleware/errorHandler";

export const app = express();

app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: false,
    strictTransportSecurity:
      process.env.NODE_ENV === "production",
  })
);

app.use(express.json({ limit: "10kb" }));

// Request logging
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

// Existing origin protection
app.use(verifyRequestOrigin);

// Public health endpoint
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "WorkFlow Pro API is running",
  });
});

// Prevent caching sensitive authentication responses.
app.use("/api/auth", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

// Existing registration and login rate limits
app.post(
  "/api/auth/register",
  registrationLimiter
);

app.post(
  "/api/auth/login",
  loginLimiter
);

// Day 48 — Retrieve the session-bound CSRF token.
app.get(
  "/api/auth/csrf",
  requireLogin,
  issueCsrfToken
);

// Day 48 — Logout also requires CSRF protection.
app.post(
  "/api/auth/logout",
  requireLogin,
  requireCsrf
);

// Existing authentication routes
app.use("/api/auth", authRoutes);

// All protected business routes require:
// 1. A real authenticated session
// 2. A valid CSRF token for unsafe requests
// 3. Permission to access the requested resource

app.use(
  "/api/tasks",
  requireLogin,
  requireCsrf,
  secureTasks,
  taskRoutes
);

app.use(
  "/api/workspaces",
  requireLogin,
  requireCsrf,
  secureWorkspaces,
  workspaceRoutes
);

app.use(
  "/api/projects",
  requireLogin,
  requireCsrf,
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
