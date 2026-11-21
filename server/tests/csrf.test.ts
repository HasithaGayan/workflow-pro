
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";

test("Day 48 session-bound CSRF protection", async (t) => {
  const server = app.listen(0, "127.0.0.1");

  const email =
    `day48.csrf.${randomUUID()}@example.com`;

  const password = "Day48-Strong-Test-Password!";

  let cookie = "";
  let csrfToken = "";
  let workspaceId: string | null = null;

  try {
    await once(server, "listening");

    const address = server.address() as AddressInfo;
    const base = `http://127.0.0.1:${address.port}`;

    function post(
      path: string,
      body: unknown,
      sessionCookie?: string,
      token?: string,
      origin?: string
    ): Promise<Response> {
      return fetch(`${base}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionCookie
            ? { Cookie: sessionCookie }
            : {}),
          ...(token
            ? { "X-CSRF-Token": token }
            : {}),
          ...(origin
            ? { Origin: origin }
            : {}),
        },
        body: JSON.stringify(body),
      });
    }

    await t.test(
      "Anonymous users cannot obtain a CSRF token",
      async () => {
        const response = await fetch(
          `${base}/api/auth/csrf`
        );

        assert.equal(response.status, 401);
      }
    );

    await t.test(
      "Register and log in a test account",
      async () => {
        const registration = await post(
          "/api/auth/register",
          {
            fullName: "Day48 CSRF Test User",
            email,
            password,
          }
        );

        assert.equal(registration.status, 201);

        const login = await post(
          "/api/auth/login",
          { email, password }
        );

        assert.equal(login.status, 200);

        cookie =
          login.headers.get("set-cookie")
            ?.split(";")[0] ?? "";

        assert.ok(cookie);
      }
    );

    await t.test(
      "Logged-in users receive a CSRF token",
      async () => {
        const response = await fetch(
          `${base}/api/auth/csrf`,
          {
            headers: {
              Cookie: cookie,
            },
          }
        );

        assert.equal(response.status, 200);

        const body = await response.json();

        assert.equal(body.success, true);
        assert.match(
          body.csrfToken,
          /^[0-9a-f]{64}$/
        );

        assert.equal(
          response.headers.get("cache-control"),
          "no-store"
        );

        csrfToken = body.csrfToken;
      }
    );

    await t.test(
      "Missing CSRF token rejects workspace creation",
      async () => {
        const response = await post(
          "/api/workspaces",
          { name: "Rejected CSRF Workspace" },
          cookie
        );

        assert.equal(response.status, 403);
      }
    );

    await t.test(
      "Incorrect CSRF token is rejected",
      async () => {
        const response = await post(
          "/api/workspaces",
          { name: "Incorrect Token Workspace" },
          cookie,
          "0".repeat(64)
        );

        assert.equal(response.status, 403);
      }
    );

    await t.test(
      "Valid CSRF token permits workspace creation",
      async () => {
        const response = await post(
          "/api/workspaces",
          { name: `CSRF Workspace ${randomUUID()}` },
          cookie,
          csrfToken
        );

        assert.equal(response.status, 201);

        const body = await response.json();

        workspaceId = body.data.id;
        assert.ok(workspaceId);
      }
    );

    await t.test(
      "Forged origin is rejected even with a valid token",
      async () => {
        const response = await post(
          "/api/workspaces",
          { name: "Forged Origin Workspace" },
          cookie,
          csrfToken,
          "https://attacker.example"
        );

        assert.equal(response.status, 403);
      }
    );

    await t.test(
      "Logout without CSRF token is rejected",
      async () => {
        const response = await post(
          "/api/auth/logout",
          {},
          cookie
        );

        assert.equal(response.status, 403);
      }
    );

    await t.test(
      "Logout with valid CSRF token succeeds",
      async () => {
        const response = await post(
          "/api/auth/logout",
          {},
          cookie,
          csrfToken
        );

        assert.equal(response.status, 200);
      }
    );

    await t.test(
      "Revoked session cannot obtain another CSRF token",
      async () => {
        const response = await fetch(
          `${base}/api/auth/csrf`,
          {
            headers: {
              Cookie: cookie,
            },
          }
        );

        assert.equal(response.status, 401);
      }
    );
  } finally {
    try {
      // Delete only records created by this test.
      if (workspaceId !== null) {
        const id = BigInt(workspaceId);

        await prisma.workspace_memberships.deleteMany({
          where: { workspace_id: id },
        });

        await prisma.workspaces.deleteMany({
          where: { workspace_id: id },
        });
      }

      // Credential and session records are linked
      // by ON DELETE CASCADE.
      await prisma.app_users.deleteMany({
        where: { email },
      });
    } finally {
      try {
        await new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) reject(error);
            else resolve();
          });
        });
      } finally {
        await prisma.$disconnect();
      }
    }
  }
});
