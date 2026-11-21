
import { rateLimit } from "express-rate-limit";

import type {
  Request,
  Response,
  NextFunction,
} from "express";

const FIFTEEN_MINUTES = 15 * 60 * 1000;

// Limit failed login attempts per client IP.
// Successful requests do not consume the quota.
export const loginLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: "Too many login attempts. Try again later.",
  },
});

// Limit account creation per client IP.
export const registrationLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many registrations. Try again later.",
  },
});

function denyRequest(
  res: Response,
  message: string
): void {
  res.status(403).json({
    success: false,
    error: message,
  });
}

function getExpectedOrigin(
  req: Request
): string | null {
  const configuredOrigin =
    process.env.WORKFLOW_ALLOWED_ORIGIN?.trim();

  // Production must have an explicitly configured origin.
  if (
    process.env.NODE_ENV === "production" &&
    !configuredOrigin
  ) {
    return null;
  }

  // Local development: compare against the current
  // server origin, unless explicitly configured.
  const candidate =
    configuredOrigin ||
    `${req.protocol}://${req.get("host")}`;

  try {
    const url = new URL(candidate);

    if (
      url.protocol !== "http:" &&
      url.protocol !== "https:"
    ) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

// Add origin-based protection for state-changing requests.
export function verifyRequestOrigin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Safe methods should not modify data.
  if (
    req.method === "GET" ||
    req.method === "HEAD" ||
    req.method === "OPTIONS"
  ) {
    next();
    return;
  }

  const expectedOrigin = getExpectedOrigin(req);

  if (!expectedOrigin) {
    res.status(503).json({
      success: false,
      error: "Security origin configuration missing",
    });
    return;
  }

  const fetchSite = req.get("sec-fetch-site");

  // Reject requests identified as cross-site.
  if (fetchSite === "cross-site") {
    denyRequest(res, "Cross-site request rejected");
    return;
  }

  const origin = req.get("origin");

  if (origin !== undefined) {
    if (origin !== expectedOrigin) {
      denyRequest(res, "Untrusted request origin");
      return;
    }

    next();
    return;
  }

  // Some clients provide Referer instead of Origin.
  const referer = req.get("referer");

  if (referer !== undefined) {
    try {
      if (new URL(referer).origin !== expectedOrigin) {
        denyRequest(res, "Untrusted request origin");
        return;
      }
    } catch {
      denyRequest(res, "Invalid request origin");
      return;
    }

    next();
    return;
  }

  // Browser requests from another same-site origin
  // must not silently bypass source-origin checking.
  if (fetchSite === "same-site") {
    denyRequest(res, "Request origin required");
    return;
  }

  // Production requires proof of an allowed origin.
  // Local automated test clients may omit these headers.
  if (process.env.NODE_ENV === "production") {
    denyRequest(res, "Request origin required");
    return;
  }

  next();
}
