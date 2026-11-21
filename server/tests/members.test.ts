
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";

type ApiResult<T> = {
  success?: boolean;
  data?: T;
  csrfToken?: string;
  error?: string;
};

type User = {
  id: string;
  fullName: string;
  email: string;
};

type Workspace = {
  id: string;
  name: string;
};

type Member = {
  userId: string;
  fullName: string;
  email: string;
  role: string;
};

test("Day 53 team membership security", async (t) => {
  // Start an isolated HTTP test server.
  const server = app.listen(0, "127.0.0.1");

  // IMPORTANT FIX:
  // Wait until the server is actually listening.
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  const address = server.address();

  assert.ok(
    address !== null &&
      typeof address !== "string"
  );

  const base = `http://127.0.0.1:${address.port}`;

  // Every test execution uses unique accounts.
  const uniqueId = randomUUID().replaceAll("-", "");

  const ownerEmail =
    `day53-owner-${uniqueId}@example.com`;

  const memberEmail =
    `day53-member-${uniqueId}@example.com`;

  const password = "Day53-Test-Password-123!";

  let ownerCookie = "";
  let memberCookie = "";

  let workspaceId = "";
  let ownerId = "";
  let memberId = "";

  // Send an HTTP request and automatically obtain
  // a session-bound CSRF token for authenticated writes.
  async function request<T>(
    method: string,
    path: string,
    cookie?: string,
    body?: unknown
  ): Promise<{
    status: number;
    result: ApiResult<T>;
    cookie: string;
  }> {
    const isWrite = ![
      "GET",
      "HEAD",
      "OPTIONS",
    ].includes(method.toUpperCase());

    let csrfToken = "";

    const isPublicAuthEndpoint = [
      "/api/auth/register",
      "/api/auth/login",
    ].includes(path);

    if (
      cookie &&
      isWrite &&
      !isPublicAuthEndpoint
    ) {
      const csrfResponse = await fetch(
        `${base}/api/auth/csrf`,
        {
          headers: {
            Cookie: cookie,
          },
        }
      );

      assert.equal(
        csrfResponse.status,
        200,
        "Expected a valid CSRF response"
      );

      const csrf = (await csrfResponse.json()) as {
        csrfToken?: string;
      };

      assert.match(
        csrf.csrfToken ?? "",
        /^[0-9a-f]{64}$/
      );

      csrfToken = csrf.csrfToken!;
    }

    const response = await fetch(
      `${base}${path}`,
      {
        method,
        headers: {
          ...(cookie
            ? { Cookie: cookie }
            : {}),

          ...(csrfToken
            ? { "X-CSRF-Token": csrfToken }
            : {}),

          ...(body !== undefined
            ? {
                "Content-Type":
                  "application/json",
              }
            : {}),
        },

        ...(body !== undefined
          ? {
              body: JSON.stringify(body),
            }
          : {}),
      }
    );

    const result =
      (await response.json()) as ApiResult<T>;

    const responseCookie =
      response.headers
        .get("set-cookie")
        ?.split(";")[0] ?? "";

    return {
      status: response.status,
      result,
      cookie: responseCookie,
    };
  }

  try {
    // TEST 1: Anonymous access is rejected.
    await t.test(
      "Anonymous requests cannot list members",
      async () => {
        const response = await request<Member[]>(
          "GET",
          "/api/team-members/999999"
        );

        assert.equal(response.status, 401);
      }
    );

    // TEST 2: Register and authenticate two users.
    await t.test(
      "Create and authenticate two test users",
      async () => {
        const ownerRegister = await request<User>(
          "POST",
          "/api/auth/register",
          undefined,
          {
            fullName: "Day53 Test Owner",
            email: ownerEmail,
            password,
          }
        );

        assert.equal(ownerRegister.status, 201);

        assert.ok(ownerRegister.result.data);

        ownerId = String(
          ownerRegister.result.data.id
        );

        const memberRegister = await request<User>(
          "POST",
          "/api/auth/register",
          undefined,
          {
            fullName: "Day53 Test Member",
            email: memberEmail,
            password,
          }
        );

        assert.equal(memberRegister.status, 201);

        assert.ok(memberRegister.result.data);

        memberId = String(
          memberRegister.result.data.id
        );

        const ownerLogin = await request<User>(
          "POST",
          "/api/auth/login",
          undefined,
          {
            email: ownerEmail,
            password,
          }
        );

        assert.equal(ownerLogin.status, 200);

        ownerCookie = ownerLogin.cookie;

        const memberLogin = await request<User>(
          "POST",
          "/api/auth/login",
          undefined,
          {
            email: memberEmail,
            password,
          }
        );

        assert.equal(memberLogin.status, 200);

        memberCookie = memberLogin.cookie;

        assert.ok(ownerCookie);
        assert.ok(memberCookie);
      }
    );

    // TEST 3: Create an isolated workspace.
    await t.test(
      "Owner creates an isolated test workspace",
      async () => {
        const response = await request<Workspace>(
          "POST",
          "/api/workspaces",
          ownerCookie,
          {
            name:
              `Day53 Test ${uniqueId.slice(0, 10)}`,
          }
        );

        assert.equal(response.status, 201);

        assert.ok(response.result.data);

        workspaceId = String(
          response.result.data.id
        );
      }
    );

    // TEST 4: Owner can see the directory.
    await t.test(
      "Owner can view the member directory",
      async () => {
        const response = await request<Member[]>(
          "GET",
          `/api/team-members/${workspaceId}`,
          ownerCookie
        );

        assert.equal(response.status, 200);

        assert.equal(
          response.result.data?.length,
          1
        );

        assert.equal(
          response.result.data?.[0]?.role,
          "owner"
        );
      }
    );

    // TEST 5: A stranger cannot view team members.
    await t.test(
      "Nonmembers cannot view private members",
      async () => {
        const response = await request<Member[]>(
          "GET",
          `/api/team-members/${workspaceId}`,
          memberCookie
        );

        assert.equal(response.status, 404);
      }
    );

    // TEST 6: Owner adds a registered user.
    await t.test(
      "Owner can add a registered member",
      async () => {
        const response = await request<Member>(
          "POST",
          `/api/team-members/${workspaceId}`,
          ownerCookie,
          {
            email: memberEmail,
            role: "member",
          }
        );

        assert.equal(response.status, 201);

        assert.equal(
          response.result.data?.role,
          "member"
        );
      }
    );

    // TEST 7: Members can view their team.
    await t.test(
      "Members can view the directory",
      async () => {
        const response = await request<Member[]>(
          "GET",
          `/api/team-members/${workspaceId}`,
          memberCookie
        );

        assert.equal(response.status, 200);

        assert.equal(
          response.result.data?.length,
          2
        );
      }
    );

    // TEST 8: Members cannot grant themselves Admin.
    await t.test(
      "A member cannot promote themselves",
      async () => {
        const response = await request<Member>(
          "PATCH",
          `/api/team-members/${workspaceId}/${memberId}`,
          memberCookie,
          {
            role: "admin",
          }
        );

        assert.equal(response.status, 403);
      }
    );

    // TEST 9: Owners can promote members.
    await t.test(
      "Owner can promote member to Admin",
      async () => {
        const response = await request<Member>(
          "PATCH",
          `/api/team-members/${workspaceId}/${memberId}`,
          ownerCookie,
          {
            role: "admin",
          }
        );

        assert.equal(response.status, 200);

        assert.equal(
          response.result.data?.role,
          "admin"
        );
      }
    );

    // TEST 10: Admin cannot remove Owner.
    await t.test(
      "Admin cannot remove the Owner",
      async () => {
        const response = await request<never>(
          "DELETE",
          `/api/team-members/${workspaceId}/${ownerId}`,
          memberCookie
        );

        assert.equal(response.status, 403);
      }
    );

    // TEST 11: Owner cannot demote themselves.
    await t.test(
      "Owner cannot demote themselves",
      async () => {
        const response = await request<never>(
          "PATCH",
          `/api/team-members/${workspaceId}/${ownerId}`,
          ownerCookie,
          {
            role: "member",
          }
        );

        assert.equal(response.status, 403);
      }
    );

    // TEST 12: Owner removes an Admin.
    await t.test(
      "Owner can remove an Admin",
      async () => {
        const response = await request<never>(
          "DELETE",
          `/api/team-members/${workspaceId}/${memberId}`,
          ownerCookie
        );

        assert.equal(response.status, 200);
      }
    );

    // TEST 13: Removed user loses workspace access.
    await t.test(
      "Removed user immediately loses access",
      async () => {
        const response = await request<Member[]>(
          "GET",
          `/api/team-members/${workspaceId}`,
          memberCookie
        );

        assert.equal(response.status, 404);
      }
    );
  } finally {
    // Clean up only temporary Day 53 test records.
    // Do NOT reset the database.

    try {
      if (workspaceId) {
        await prisma.workspace_memberships.deleteMany({
          where: {
            workspace_id: BigInt(workspaceId),
          },
        });

        await prisma.workspaces.delete({
          where: {
            workspace_id: BigInt(workspaceId),
          },
        });
      }

      await prisma.app_users.deleteMany({
        where: {
          email: {
            in: [
              ownerEmail,
              memberEmail,
            ],
          },
        },
      });
    } finally {
      // Close the temporary HTTP server.
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      // Disconnect Prisma.
      await prisma.$disconnect();
    }
  }
});
