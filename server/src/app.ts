
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

import { errorHandler } from "./middleware/errorHandler";

export const app = express();

app.disable("x-powered-by");

// Day 48 — Security headers.
// Do not enable HSTS for local HTTP development.
app.use(
  helmet({
    contentSecurityPolicy: false,
    strictTransportSecurity:
      process.env.NODE_ENV === "production",
  })
);

app.use(express.json({ limit: "10kb" }));

// Existing request logging
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

// Day 48 — Reject untrusted origins on unsafe requests.
app.use(verifyRequestOrigin);

// Public health endpoint
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "WorkFlow Pro API is running",
  });
});

// Authentication responses must not be cached.
app.use("/api/auth", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

// Day 48 — Limits for registration and login.
app.post(
  "/api/auth/register",
  registrationLimiter
);

app.post(
  "/api/auth/login",
  loginLimiter
);

// Day 46 — Authentication endpoints
app.use("/api/auth", authRoutes);

// Day 47 — Authenticated, authorized business routes
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
