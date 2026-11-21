
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";

test("Day 46 authentication API", async (t) => {
  const server = app.listen(0, "127.0.0.1");

  const email =
    `day46.${randomUUID()}@example.com`;

  const password =
    "Day46-Strong-Test-Password!";

  let sessionCookie: string | null = null;

  try {
    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });

    const address =
      server.address() as AddressInfo;

    const base =
      `http://127.0.0.1:${address.port}`;

    function post(
      path: string,
      body: unknown,
      cookie?: string
    ) {
      return fetch(`${base}/api/auth/${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: JSON.stringify(body),
      });
    }

    await t.test(
      "Reject weak registration password",
      async () => {
        const response = await post(
          "register",
          {
            fullName: "Day 46 Test User",
            email,
            password: "short",
          }
        );

        assert.equal(response.status, 400);
      }
    );

    await t.test(
      "Register a new user",
      async () => {
        const response = await post(
          "register",
          {
            fullName: "Day 46 Test User",
            email,
            password,
          }
        );

        assert.equal(response.status, 201);

        const body = await response.json();

        assert.equal(body.success, true);
        assert.equal(body.data.email, email);
        assert.ok(body.data.id);
        assert.equal(
          JSON.stringify(body).includes(password),
          false
        );
      }
    );

    await t.test(
      "Reject duplicate email",
      async () => {
        const response = await post(
          "register",
          {
            fullName: "Duplicate User",
            email,
            password,
          }
        );

        assert.equal(response.status, 409);
      }
    );

    await t.test(
      "Reject incorrect password",
      async () => {
        const response = await post(
          "login",
          {
            email,
            password: "Wrong-Password-12345",
          }
        );

        assert.equal(response.status, 401);
      }
    );

    await t.test(
      "Reject unknown login",
      async () => {
        const response = await post(
          "login",
          {
            email: "unknown@example.com",
            password,
          }
        );

        assert.equal(response.status, 401);
      }
    );

    await t.test(
      "Login creates an HttpOnly session",
      async () => {
        const response = await post(
          "login",
          { email, password }
        );

        assert.equal(response.status, 200);

        const body = await response.json();

        assert.equal(body.success, true);
        assert.equal(body.data.email, email);

        const setCookie =
          response.headers.get("set-cookie");

        assert.ok(setCookie);
        assert.match(setCookie, /HttpOnly/i);
        assert.match(
          setCookie,
          /SameSite=Strict/i
        );

        sessionCookie =
          setCookie.split(";")[0];

        assert.ok(sessionCookie);
      }
    );

    await t.test(
      "Reject unauthenticated profile request",
      async () => {
        const response = await fetch(
          `${base}/api/auth/me`
        );

        assert.equal(response.status, 401);
      }
    );

    await t.test(
      "Valid session returns current user",
      async () => {
        assert.ok(sessionCookie);

        const response = await fetch(
          `${base}/api/auth/me`,
          {
            headers: {
              Cookie: sessionCookie,
            },
          }
        );

        assert.equal(response.status, 200);

        const body = await response.json();

        assert.equal(body.data.email, email);
      }
    );

    await t.test(
      "Logout revokes the session",
      async () => {
        assert.ok(sessionCookie);

        const response = await post(
          "logout",
          {},
          sessionCookie
        );

        assert.equal(response.status, 200);
      }
    );

    await t.test(
      "Old session cannot authenticate",
      async () => {
        assert.ok(sessionCookie);

        const response = await fetch(
          `${base}/api/auth/me`,
          {
            headers: {
              Cookie: sessionCookie,
            },
          }
        );

        assert.equal(response.status, 401);
      }
    );
  } finally {
    try {
      // Remove only this test's user.
      // Its credentials and sessions have
      // ON DELETE CASCADE relationships.
      await prisma.app_users.deleteMany({
        where: { email },
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
  }
});
