import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { ipKeyGenerator } from "express-rate-limit";
import type { RequestHandler } from "express";
import { consumeAuthRateLimit } from "../lib/authRateLimit";

type Operation = "login" | "register";

export function createCloudAuthLimiter(
  operation: Operation,
  localLimiter: RequestHandler
): RequestHandler {

  const limit = operation === "login" ? 5 : 10;

  return async (req, res, next) => {

    const secret = process.env.WORKFLOW_PROXY_SECRET ?? "";

    const cloudMode =
      process.env.VERCEL === "1" ||
      process.env.WORKFLOW_REQUIRE_PROXY_AUTH === "1" ||
      secret.length > 0;

    // Preserve existing local rate limiting.
    if (!cloudMode) {
      return localLimiter(req, res, next);
    }

    res.setHeader("Cache-Control", "no-store");

    // This header comes from the authenticated frontend proxy.
    const ip = req.get("X-Workflow-Client-IP") ?? "";

    if (
      !/^[0-9a-f]{64}$/.test(secret) ||
      !isIP(ip) ||
      ip.includes("%")
    ) {
      res.status(503).json({
        success: false,
        error: "Authentication protection unavailable",
      });
      return;
    }

    try {
      // Group IPv6 addresses by subnet.
      const clientKey = ipKeyGenerator(ip, 56);

      // Avoid storing raw client IP addresses.
      const digest = createHmac("sha256", secret)
        .update(`workflow:rate-limit:v1:${operation}:${clientKey}`)
        .digest("hex");

      const counter = await consumeAuthRateLimit(
        `${operation}:${digest}`
      );

      const remaining = Math.max(0, limit - counter.hits);

      const retryAfter = Math.max(
        1,
        Math.ceil(
          (counter.reset_at.getTime() - Date.now()) / 1000
        )
      );

      res.setHeader("X-RateLimit-Limit", String(limit));
      res.setHeader("X-RateLimit-Remaining", String(remaining));

      if (counter.hits > limit) {
        res.setHeader("Retry-After", String(retryAfter));

        res.status(429).json({
          success: false,
          error: "Too many attempts. Try again later.",
        });
        return;
      }

      next();

    } catch {
      // Fail closed when shared protection is unavailable.
      res.status(503).json({
        success: false,
        error: "Authentication protection unavailable",
      });
    }
  };
}
