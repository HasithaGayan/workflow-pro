import { timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

export function requireTrustedProxy(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // The health endpoint exposes no private application data.
  if (req.method === "GET" && req.path === "/api/health") {
    next();
    return;
  }

  const secret = process.env.WORKFLOW_PROXY_SECRET ?? "";

  const required =
    process.env.WORKFLOW_REQUIRE_PROXY_AUTH === "1" ||
    process.env.VERCEL === "1";

  // Preserve existing local development behavior.
  if (!required && !secret) {
    next();
    return;
  }

  if (!/^[0-9a-f]{64}$/.test(secret)) {
    res.status(503).json({
      success: false,
      error: "Backend security configuration unavailable",
    });
    return;
  }

  const supplied = req.get("X-Workflow-Proxy-Key") ?? "";

  if (
    !/^[0-9a-f]{64}$/.test(supplied) ||
    !timingSafeEqual(
      Buffer.from(secret, "hex"),
      Buffer.from(supplied, "hex")
    )
  ) {
    res.status(403).json({
      success: false,
      error: "Unauthorized backend request",
    });
    return;
  }

  next();
}
