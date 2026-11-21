
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";

test("Day 46 authentication API", async (t) => {
  const server = app.listen(0, "127.0.0.1");

  const email = `day46.${randomUUID()}@example.com`;
  const unknownEmail =
    `unknown.${randomUUID()}@example.com`;

  const password = "Day46-Strong-Password-2026!";

  let cookie = "";

  try {
    await once(server, "listening");

    const address = server.address() as AddressInfo;
    const base = `http://127.0.0.1:${address.port}`;

    // Public auth requests use no CSRF token.
    // Logout requires the logged-in session's CSRF token.
    async function post(
      path: string,
      body: unknown,
      sessionCookie?: string
    ): Promise<Response> {
      let csrfToken: string | undefined;

      if (path === "logout" && sessionCookie) {
        const csrfResponse = await fetch(
          `${base}/api/auth/csrf`,
          {
            headers: {
              Cookie: sessionCookie,
            },
          }
        );

        assert.equal(csrfResponse.status, 200);

        const csrfBody = await csrfResponse.json();

        csrfToken = csrfBody.csrfToken;

        assert.equal(typeof csrfToken, "string");
        assert.match(csrfToken!, /^[0-9a-f]{64}$/);
      }

      return fetch(`${base}/api/auth/${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",

          ...(sessionCookie
            ? { Cookie: sessionCookie }
            : {}),

          ...(csrfToken
            ? { "X-CSRF-Token": csrfToken }
            : {}),
        },
        body: JSON.stringify(body),
      });
    }

    function getProfile(
      sessionCookie?: string
    ): Promise<Response> {
      return fetch(`${base}/api/auth/me`, {
        headers: sessionCookie
          ? { Cookie: sessionCookie }
          : {},
      });
    }

    await t.test(
      "Reject weak registration password",
      async () => {
        const response = await post(
          "register",
          {
            fullName: "Day46 Test User",
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
            fullName: "Day46 Test User",
            email,
            password,
          }
        );

        assert.equal(response.status, 201);

        const body = await response.json();

        assert.equal(body.success, true);
        assert.equal(body.data.email, email);

        // Never expose password hashes in API responses.
        assert.equal(
          JSON.stringify(body).includes("password_hash"),
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
            fullName: "Duplicate Test User",
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
            password: "Incorrect-Password-123!",
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
            email: unknownEmail,
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
          {
            email,
            password,
          }
        );

        assert.equal(response.status, 200);

        const setCookie =
          response.headers.get("set-cookie") ?? "";

        assert.match(setCookie, /HttpOnly/i);
        assert.match(setCookie, /SameSite=Strict/i);

        cookie = setCookie.split(";")[0];

        assert.ok(cookie);
      }
    );

    await t.test(
      "Reject unauthenticated profile request",
      async () => {
        const response = await getProfile();

        assert.equal(response.status, 401);
      }
    );

    await t.test(
      "Valid session returns current user",
      async () => {
        const response = await getProfile(cookie);

        assert.equal(response.status, 200);

        const body = await response.json();

        assert.equal(body.data.email, email);
      }
    );

    await t.test(
      "Logout revokes the session",
      async () => {
        const response = await post(
          "logout",
          {},
          cookie
        );

        assert.equal(response.status, 200);
      }
    );

    await t.test(
      "Old session cannot authenticate",
      async () => {
        const response = await getProfile(cookie);

        assert.equal(response.status, 401);
      }
    );
  } finally {
    try {
      // Delete only the temporary Day 46 test user.
      // Credentials/sessions cascade in PostgreSQL.
      await prisma.app_users.deleteMany({
        where: {
          email,
        },
      });
    } finally {
      try {
        await new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
      } finally {
        await prisma.$disconnect();
      }
    }
  }
});
