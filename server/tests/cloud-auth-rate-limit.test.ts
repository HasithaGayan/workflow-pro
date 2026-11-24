import assert from "node:assert/strict";
import test from "node:test";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import express from "express";

import { prisma } from "../src/lib/prisma";
import { consumeAuthRateLimit } from "../src/lib/authRateLimit";
import { requireTrustedProxy } from "../src/middleware/trustedProxy";
import { createCloudAuthLimiter } from "../src/middleware/cloudAuthRateLimit";

test("PostgreSQL shared authentication rate limits", async (t) => {
  const db = new URL(process.env.DATABASE_URL ?? "");

  assert.equal(process.env.WORKFLOW_DISPOSABLE_DB_TEST, "1");
  assert.equal(db.hostname, "127.0.0.1");
  assert.equal(db.pathname, "/workflow_rate_test");

  const secret = randomBytes(32).toString("hex");
  const counterKey = `login:${randomBytes(32).toString("hex")}`;

  process.env.WORKFLOW_PROXY_SECRET = secret;
  process.env.WORKFLOW_REQUIRE_PROXY_AUTH = "1";

  const app = express();

  app.use(requireTrustedProxy);

  const local: express.RequestHandler =
    (_req, _res, next) => next();

  // Separate middleware instances share PostgreSQL counters.
  app.post(
    "/login-a",
    createCloudAuthLimiter("login", local),
    (_req, res) => res.sendStatus(204)
  );

  app.post(
    "/login-b",
    createCloudAuthLimiter("login", local),
    (_req, res) => res.sendStatus(204)
  );

  app.post(
    "/register",
    createCloudAuthLimiter("register", local),
    (_req, res) => res.sendStatus(204)
  );

  const server = app.listen(0, "127.0.0.1");

  try {
    await once(server, "listening");

    const address = server.address();

    assert.ok(address && typeof address === "object");

    const base = `http://127.0.0.1:${address.port}`;

    async function probe(
      path: string,
      ip?: string,
      key = secret
    ) {
      const headers: Record<string, string> = {
        "X-Workflow-Proxy-Key": key,
      };

      if (ip) {
        headers["X-Workflow-Client-IP"] = ip;
      }

      const response = await fetch(base + path, {
        method: "POST",
        headers,
      });

      const result = {
        status: response.status,
        retryAfter: response.headers.get("Retry-After"),
      };

      await response.text();

      return result;
    }

    await t.test("Atomic concurrent database counters", async () => {
      const records = await Promise.all(
        Array.from(
          { length: 12 },
          () => consumeAuthRateLimit(counterKey)
        )
      );

      const hits = records
        .map((record) => record.hits)
        .sort((a, b) => a - b);

      assert.deepEqual(
        hits,
        Array.from({ length: 12 }, (_, i) => i + 1)
      );
    });

    await t.test("Expired counter resets correctly", async () => {
      await prisma.$executeRaw`
        UPDATE "auth_rate_limits"
        SET "reset_at" = CURRENT_TIMESTAMP - INTERVAL '1 minute'
        WHERE "rate_key" = ${counterKey}
      `;

      const result = await consumeAuthRateLimit(counterKey);

      assert.equal(result.hits, 1);
      assert.ok(result.reset_at.getTime() > Date.now());
    });

    await t.test("Five login attempts permitted", async () => {
      for (let i = 0; i < 5; i++) {
        assert.equal(
          (await probe("/login-a", "192.0.2.10")).status,
          204
        );
      }
    });

    await t.test("Sixth login blocked across middleware instances", async () => {
      const result = await probe("/login-b", "192.0.2.10");

      assert.equal(result.status, 429);
      assert.ok(Number(result.retryAfter) > 0);
    });

    await t.test("Separate client retains independent quota", async () => {
      assert.equal(
        (await probe("/login-a", "192.0.2.11")).status,
        204
      );
    });

    await t.test("Registration has independent quota", async () => {
      for (let i = 0; i < 10; i++) {
        assert.equal(
          (await probe("/register", "192.0.2.10")).status,
          204
        );
      }

      assert.equal(
        (await probe("/register", "192.0.2.10")).status,
        429
      );
    });

    await t.test("Missing client IP rejected", async () => {
      assert.equal((await probe("/login-a")).status, 503);
    });

    await t.test("Invalid client IP rejected", async () => {
      assert.equal(
        (await probe("/login-a", "invalid-ip")).status,
        503
      );
    });

    await t.test("Invalid proxy authentication rejected", async () => {
      assert.equal(
        (await probe("/login-a", "192.0.2.12", "invalid")).status,
        403
      );
    });

  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    await prisma.$disconnect();
  }
});
