
import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import type {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  SESSION_COOKIE_NAME,
} from "../services/authService";

// Use the same cookie name as the Day 46 login system.
function readSessionToken(
  req: Request
): string | null {
  const header = req.headers.cookie;

  if (!header) {
    return null;
  }

  const prefix = `${SESSION_COOKIE_NAME}=`;

  for (const part of header.split(";")) {
    const cookie = part.trim();

    if (cookie.startsWith(prefix)) {
      const token = cookie.slice(prefix.length);

      // Session tokens are 32 random bytes,
      // represented by 64 lowercase hexadecimal chars.
      return /^[0-9a-f]{64}$/.test(token)
        ? token
        : null;
    }
  }

  return null;
}

// Derive a separate CSRF secret from each login session.
// The original login token is never returned to the API client
// as a CSRF response value.
function createCsrfToken(sessionToken: string): string {
  const key = Buffer.from(sessionToken, "hex");

  return createHmac("sha256", key)
    .update("workflow-pro:csrf:v1")
    .digest("hex");
}

function rejectCsrf(res: Response): void {
  res.status(403).json({
    success: false,
    error: "Invalid or missing CSRF token",
  });
}

// GET /api/auth/csrf
// requireLogin must run before this handler.
export function issueCsrfToken(
  req: Request,
  res: Response
): void {
  const sessionToken = readSessionToken(req);

  if (!sessionToken) {
    res.status(401).json({
      success: false,
      error: "Authentication required",
    });
    return;
  }

  res.setHeader("Cache-Control", "no-store");

  res.status(200).json({
    success: true,
    csrfToken: createCsrfToken(sessionToken),
  });
}

// Run after requireLogin on authenticated routes.
export function requireCsrf(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (
    req.method === "GET" ||
    req.method === "HEAD" ||
    req.method === "OPTIONS"
  ) {
    next();
    return;
  }

  const sessionToken = readSessionToken(req);
  const submittedToken = req.get("x-csrf-token");

  if (
    !sessionToken ||
    !submittedToken ||
    !/^[0-9a-f]{64}$/.test(submittedToken)
  ) {
    rejectCsrf(res);
    return;
  }

  const expected = Buffer.from(
    createCsrfToken(sessionToken),
    "hex"
  );

  const supplied = Buffer.from(
    submittedToken,
    "hex"
  );

  // Avoid ordinary string comparison for security tokens.
  if (!timingSafeEqual(expected, supplied)) {
    rejectCsrf(res);
    return;
  }

  next();
}
