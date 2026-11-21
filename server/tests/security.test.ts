
import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { app } from "../src/app";

test("Day 48 security hardening", async (t) => {
  const server = app.listen(0, "127.0.0.1");

  try {
    await once(server, "listening");

    const address = server.address() as AddressInfo;
    const base = `http://127.0.0.1:${address.port}`;

    function post(
      path: string,
      extraHeaders: Record<string, string> = {}
    ): Promise<Response> {
      return fetch(`${base}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...extraHeaders,
        },
        body: JSON.stringify({
          email: "unknown.day48@example.com",
          password: "NotTheCorrectPassword123!",
        }),
      });
    }

    await t.test(
      "Security headers are present",
      async () => {
        const response = await fetch(
          `${base}/api/health`
        );

        assert.equal(response.status, 200);

        assert.equal(
          response.headers.get("x-content-type-options"),
          "nosniff"
        );

        assert.equal(
          response.headers.get("x-powered-by"),
          null
        );

        assert.ok(
          response.headers.get("x-frame-options")
        );
      }
    );

    await t.test(
      "Reject forged registration origin",
      async () => {
        const response = await post(
          "/api/auth/register",
          {
            Origin: "https://attacker.example",
          }
        );

        assert.equal(response.status, 403);
      }
    );

    await t.test(
      "Reject null request origin",
      async () => {
        const response = await post(
          "/api/projects",
          { Origin: "null" }
        );

        assert.equal(response.status, 403);
      }
    );

    await t.test(
      "Reject cross-site Fetch Metadata",
      async () => {
        const response = await post(
          "/api/projects",
          { "Sec-Fetch-Site": "cross-site" }
        );

        assert.equal(response.status, 403);
      }
    );

    await t.test(
      "Trusted origin reaches authentication check",
      async () => {
        const response = await post(
          "/api/projects",
          { Origin: base }
        );

        // Origin passes, but there is no login cookie.
        assert.equal(response.status, 401);
      }
    );

    await t.test(
      "Authentication responses cannot be cached",
      async () => {
        const response = await fetch(
          `${base}/api/auth/me`
        );

        assert.equal(response.status, 401);

        assert.equal(
          response.headers.get("cache-control"),
          "no-store"
        );
      }
    );

    await t.test(
      "Five failed logins return 401",
      async () => {
        for (let attempt = 0; attempt < 5; attempt++) {
          const response = await post(
            "/api/auth/login"
          );

          assert.equal(response.status, 401);
        }
      }
    );

    await t.test(
      "Sixth failed login attempt is rate-limited",
      async () => {
        const response = await post(
          "/api/auth/login"
        );

        assert.equal(response.status, 429);

        const body = await response.json();

        assert.equal(body.success, false);
        assert.ok(
          response.headers.get("retry-after")
        );
      }
    );
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
});
