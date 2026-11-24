import { prisma } from "./prisma";

type RateLimitRecord = {
  hits: number;
  reset_at: Date;
};

export async function consumeAuthRateLimit(
  rateKey: string
): Promise<RateLimitRecord> {

  // Store a keyed digest rather than a raw client IP.
  if (!/^(login|register):[0-9a-f]{64}$/.test(rateKey)) {
    throw new Error("Invalid rate limit key");
  }

  // PostgreSQL performs the counter update atomically.
  // All application instances share the same counter.
  const rows = await prisma.$queryRaw<RateLimitRecord[]>`
    INSERT INTO "auth_rate_limits" (
      "rate_key",
      "hits",
      "reset_at"
    )
    VALUES (
      ${rateKey},
      1,
      CURRENT_TIMESTAMP + INTERVAL '15 minutes'
    )
    ON CONFLICT ("rate_key")
    DO UPDATE SET
      "hits" = CASE
        WHEN "auth_rate_limits"."reset_at" <= CURRENT_TIMESTAMP
          THEN 1
        ELSE LEAST(
          "auth_rate_limits"."hits"::bigint + 1,
          2147483647
        )::integer
      END,
      "reset_at" = CASE
        WHEN "auth_rate_limits"."reset_at" <= CURRENT_TIMESTAMP
          THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes'
        ELSE "auth_rate_limits"."reset_at"
      END
    RETURNING "hits", "reset_at"
  `;

  if (rows.length !== 1) {
    throw new Error("Rate limit counter unavailable");
  }

  if (Math.random() < 0.05) {
    try {
      await cleanupExpiredAuthRateLimits();
    } catch {
      // Cleanup is optional; the rate-limit counter is already updated.
      console.warn("Expired rate-limit cleanup unavailable");
    }
  }

  return rows[0];
}

export async function cleanupExpiredAuthRateLimits(): Promise<number> {

  // Delete only old, expired counters in bounded batches.
  // Skip rows currently locked by another application instance.
  return prisma.$executeRaw`
    WITH expired AS (
      SELECT "rate_key"
      FROM "auth_rate_limits"
      WHERE "reset_at" <
        CURRENT_TIMESTAMP - INTERVAL '24 hours'
      ORDER BY "reset_at"
      LIMIT 500
      FOR UPDATE SKIP LOCKED
    )
    DELETE FROM "auth_rate_limits" AS limits
    USING expired
    WHERE limits."rate_key" = expired."rate_key"
  `;
}
