import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "../src/lib/prisma";
import {
  cleanupExpiredAuthRateLimits,
} from "../src/lib/authRateLimit";

test("Bounded expired rate-limit cleanup", async (t) => {
  const db = new URL(process.env.DATABASE_URL ?? "");

  assert.equal(process.env.WORKFLOW_DISPOSABLE_DB_TEST, "1");
  assert.equal(db.hostname, "127.0.0.1");
  assert.equal(db.pathname, "/workflow_rate_test");

  try {
    await prisma.$executeRaw`
      INSERT INTO "auth_rate_limits"
        ("rate_key", "hits", "reset_at")
      SELECT
        'register:' || repeat(md5('cleanup-fixture-' || n::text), 2),
        1,
        CASE
          WHEN n <= 501
            THEN CURRENT_TIMESTAMP - INTERVAL '25 hours'
          WHEN n = 502
            THEN CURRENT_TIMESTAMP - INTERVAL '1 hour'
          ELSE CURRENT_TIMESTAMP + INTERVAL '15 minutes'
        END
      FROM generate_series(1, 503) AS fixture(n)
    `;

    await t.test("Cleanup removes maximum 500 old counters", async () => {
      const removed = await cleanupExpiredAuthRateLimits();

      assert.equal(removed, 500);
      assert.equal(await prisma.auth_rate_limits.count(), 3);
    });

    await t.test("Second cleanup removes remaining old counter", async () => {
      assert.equal(await cleanupExpiredAuthRateLimits(), 1);
      assert.equal(await prisma.auth_rate_limits.count(), 2);
    });

    await t.test("Active and recently expired counters preserved", async () => {
      const rows = await prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*)::integer AS count
        FROM "auth_rate_limits"
        WHERE "reset_at" >=
          CURRENT_TIMESTAMP - INTERVAL '24 hours'
      `;

      assert.equal(rows[0].count, 2);
      assert.equal(await cleanupExpiredAuthRateLimits(), 0);
    });

  } finally {
    await prisma.$disconnect();
  }
});
