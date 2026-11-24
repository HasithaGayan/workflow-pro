import assert from "node:assert/strict";
import test from "node:test";
import { once } from "node:events";
import express from "express";
import { requireTrustedProxy } from "../src/middleware/trustedProxy";

test("Trusted proxy security verification", async (t) => {
  const keys = [
    "WORKFLOW_PROXY_SECRET",
    "WORKFLOW_REQUIRE_PROXY_AUTH",
    "VERCEL",
  ] as const;

  const previous = keys.map((key) => process.env[key]);

  // Synthetic test keys only. Never use these in production.
  const secret = "a".repeat(64);
  const wrongSecret = "b".repeat(64);

  const app = express();

  app.use(requireTrustedProxy);

  app.use((_req, res) => {
    res.sendStatus(204);
  });

  const server = app.listen(0, "127.0.0.1");

  try {
    await once(server, "listening");

    const address = server.address();

    assert.ok(address && typeof address === "object");

    const base = `http://127.0.0.1:${address.port}`;

    async function probe(
      path = "/api/tasks",
      key?: string,
      method = "GET"
    ) {
      const response = await fetch(base + path, {
        method,
        headers: key
          ? { "X-Workflow-Proxy-Key": key }
          : {},
      });

      const status = response.status;
      await response.text();
      return status;
    }

    delete process.env.VERCEL;

    process.env.WORKFLOW_REQUIRE_PROXY_AUTH = "1";
    process.env.WORKFLOW_PROXY_SECRET = secret;

    await t.test("Valid proxy key accepted", async () => {
      assert.equal(await probe("/api/tasks", secret), 204);
    });

    await t.test("Missing proxy key rejected", async () => {
      assert.equal(await probe(), 403);
    });

    await t.test("Incorrect proxy key rejected", async () => {
      assert.equal(await probe("/api/tasks", wrongSecret), 403);
    });

    await t.test("Malformed proxy key rejected", async () => {
      assert.equal(await probe("/api/tasks", "invalid"), 403);
    });

    await t.test("Public health endpoint available", async () => {
      assert.equal(await probe("/api/health"), 204);
    });

    await t.test("Health POST is not exempt", async () => {
      assert.equal(await probe("/api/health", undefined, "POST"), 403);
    });

    await t.test("Missing configuration fails closed", async () => {
      delete process.env.WORKFLOW_PROXY_SECRET;
      assert.equal(await probe(), 503);
    });

    await t.test("Invalid configuration fails closed", async () => {
      process.env.WORKFLOW_PROXY_SECRET = "invalid";
      assert.equal(await probe(), 503);
    });

    await t.test("Vercel requires proxy authentication", async () => {
      delete process.env.WORKFLOW_PROXY_SECRET;
      delete process.env.WORKFLOW_REQUIRE_PROXY_AUTH;
      process.env.VERCEL = "1";

      assert.equal(await probe(), 503);
    });

    await t.test("Local development remains compatible", async () => {
      delete process.env.VERCEL;
      assert.equal(await probe(), 204);
    });

  } finally {
    keys.forEach((key, index) => {
      const value = previous[index];

      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });

    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
});
