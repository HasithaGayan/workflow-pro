
import express from "express";
import { randomUUID } from "node:crypto";
import helmet from "helmet";
import { requireTrustedProxy } from "./middleware/trustedProxy";

import { taskRoutes } from "./routes/taskRoutes";

import {
  workspaceRoutes,
  projectRoutes,
} from "./routes/teamRoutes";

import { authRoutes } from "./routes/authRoutes";
import { memberRoutes } from "./routes/memberRoutes";

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

app.use(requireTrustedProxy);

app.use(express.json({ limit: "10kb" }));

// Request logging.
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

// Reject untrusted browser request origins.
app.use(verifyRequestOrigin);

// Public health endpoint.
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "WorkFlow Pro API is running",
  });
});

// Sensitive authentication responses must not be cached.
app.use("/api/auth", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

// Registration and login rate limits.
app.post(
  "/api/auth/register",
  registrationLimiter
);

app.post(
  "/api/auth/login",
  loginLimiter
);

// Session-bound CSRF token endpoint.
app.get(
  "/api/auth/csrf",
  requireLogin,
  issueCsrfToken
);

// Logout requires a valid session and CSRF token.
app.post(
  "/api/auth/logout",
  requireLogin,
  requireCsrf
);

// Existing authentication routes.
app.use("/api/auth", authRoutes);

// Existing task routes.
app.use(
  "/api/tasks",
  requireLogin,
  requireCsrf,
  secureTasks,
  taskRoutes
);

// Existing workspace routes.
app.use(
  "/api/workspaces",
  requireLogin,
  requireCsrf,
  secureWorkspaces,
  workspaceRoutes
);

// Existing project routes.
app.use(
  "/api/projects",
  requireLogin,
  requireCsrf,
  secureProjects,
  projectRoutes
);

// Day 53: protected team membership management.
// The memberRoutes handlers additionally check
// workspace membership and Owner permissions.
app.use(
  "/api/team-members",
  requireLogin,
  requireCsrf,
  memberRoutes
);

// Unknown routes.
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

// Central error handler.
app.use(errorHandler);

export default app;
