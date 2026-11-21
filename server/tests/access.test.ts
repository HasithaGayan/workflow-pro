
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";

test("Day 47 workspace authorization", async (t) => {
  const server = app.listen(0, "127.0.0.1");

  const unique = randomUUID();

  const emailA = `day47.a.${unique}@example.com`;
  const emailB = `day47.b.${unique}@example.com`;

  const workspaceNameA = `Day47 A ${unique}`;
  const workspaceNameB = `Day47 B ${unique}`;

  const password = "Day47-Strong-Password!";

  let cookieA = "";
  let cookieB = "";
  let workspaceA = "";
  let projectA = "";
  let taskA = 0;

  try {
    await once(server, "listening");

    const address = server.address() as AddressInfo;
    const base = `http://127.0.0.1:${address.port}`;

    // Automatically add CSRF protection whenever
    // an authenticated user changes data.
    async function request(
      path: string,
      method = "GET",
      body?: unknown,
      cookie?: string
    ): Promise<Response> {
      const isWrite = ![
        "GET",
        "HEAD",
        "OPTIONS",
      ].includes(method.toUpperCase());

      let csrfToken: string | undefined;

      if (isWrite && cookie) {
        const csrfResponse = await fetch(
          `${base}/api/auth/csrf`,
          {
            headers: {
              Cookie: cookie,
            },
          }
        );

        assert.equal(csrfResponse.status, 200);

        const csrfBody = await csrfResponse.json();

        csrfToken = csrfBody.csrfToken;

        assert.equal(typeof csrfToken, "string");
        assert.match(csrfToken!, /^[0-9a-f]{64}$/);
      }

      return fetch(`${base}${path}`, {
        method,
        headers: {
          ...(body !== undefined
            ? {
                "Content-Type": "application/json",
              }
            : {}),

          ...(cookie
            ? { Cookie: cookie }
            : {}),

          ...(csrfToken
            ? { "X-CSRF-Token": csrfToken }
            : {}),
        },

        ...(body !== undefined
          ? {
              body: JSON.stringify(body),
            }
          : {}),
      });
    }

    async function registerAndLogin(
      fullName: string,
      email: string
    ): Promise<string> {
      const registration = await request(
        "/api/auth/register",
        "POST",
        {
          fullName,
          email,
          password,
        }
      );

      assert.equal(registration.status, 201);

      const login = await request(
        "/api/auth/login",
        "POST",
        {
          email,
          password,
        }
      );

      assert.equal(login.status, 200);

      const cookie = login.headers
        .get("set-cookie")
        ?.split(";")[0];

      assert.ok(cookie);

      return cookie;
    }

    await t.test(
      "Anonymous users cannot access tasks",
      async () => {
        const response = await request(
          "/api/tasks"
        );

        assert.equal(response.status, 401);
      }
    );

    await t.test(
      "Two separate users can authenticate",
      async () => {
        cookieA = await registerAndLogin(
          "Day47 Alice Test",
          emailA
        );

        cookieB = await registerAndLogin(
          "Day47 Bob Test",
          emailB
        );

        assert.notEqual(cookieA, cookieB);
      }
    );

    await t.test(
      "Each user creates their own workspace",
      async () => {
        const responseA = await request(
          "/api/workspaces",
          "POST",
          {
            name: workspaceNameA,
          },
          cookieA
        );

        assert.equal(responseA.status, 201);

        workspaceA = (
          await responseA.json()
        ).data.id;

        const responseB = await request(
          "/api/workspaces",
          "POST",
          {
            name: workspaceNameB,
          },
          cookieB
        );

        assert.equal(responseB.status, 201);
      }
    );

    await t.test(
      "Owner creates a project",
      async () => {
        const response = await request(
          "/api/projects",
          "POST",
          {
            workspaceId: workspaceA,
            name: "Day47 Secure Project",
          },
          cookieA
        );

        assert.equal(response.status, 201);

        projectA = (
          await response.json()
        ).data.id;
      }
    );

    await t.test(
      "Other user cannot create in private workspace",
      async () => {
        const response = await request(
          "/api/projects",
          "POST",
          {
            workspaceId: workspaceA,
            name: "Unauthorized Project",
          },
          cookieB
        );

        assert.equal(response.status, 404);
      }
    );

    await t.test(
      "Owner creates a task",
      async () => {
        const response = await request(
          "/api/tasks",
          "POST",
          {
            projectId: projectA,
            title: "Private Team Task",
          },
          cookieA
        );

        assert.equal(response.status, 201);

        taskA = (
          await response.json()
        ).data.id;

        assert.ok(taskA);
      }
    );

    await t.test(
      "Other user cannot read or update private task",
      async () => {
        const read = await request(
          `/api/tasks/${taskA}`,
          "GET",
          undefined,
          cookieB
        );

        assert.equal(read.status, 404);

        const update = await request(
          `/api/tasks/${taskA}`,
          "PATCH",
          {
            status: "done",
          },
          cookieB
        );

        assert.equal(update.status, 404);
      }
    );

    await t.test(
      "Other user cannot list private project tasks",
      async () => {
        const response = await request(
          `/api/projects/${projectA}/tasks`,
          "GET",
          undefined,
          cookieB
        );

        assert.equal(response.status, 404);
      }
    );

    await t.test(
      "Global task list is scoped to membership",
      async () => {
        const ownerResponse = await request(
          "/api/tasks",
          "GET",
          undefined,
          cookieA
        );

        assert.equal(ownerResponse.status, 200);

        const ownerBody =
          await ownerResponse.json();

        assert.ok(
          ownerBody.data.some(
            (task: { id: number }) =>
              task.id === taskA
          )
        );

        const outsiderResponse = await request(
          "/api/tasks",
          "GET",
          undefined,
          cookieB
        );

        assert.equal(outsiderResponse.status, 200);

        const outsiderBody =
          await outsiderResponse.json();

        assert.equal(
          outsiderBody.data.some(
            (task: { id: number }) =>
              task.id === taskA
          ),
          false
        );
      }
    );

    await t.test(
      "Private workspace projects stay private",
      async () => {
        const response = await request(
          `/api/workspaces/${workspaceA}/projects`,
          "GET",
          undefined,
          cookieB
        );

        assert.equal(response.status, 404);
      }
    );
  } finally {
    try {
      // Clean up only the two temporary workspaces.
      const workspaces = await prisma.workspaces.findMany({
        where: {
          name: {
            in: [
              workspaceNameA,
              workspaceNameB,
            ],
          },
        },
        select: {
          workspace_id: true,
        },
      });

      const workspaceIds = workspaces.map(
        (row) => row.workspace_id
      );

      const projects = await prisma.projects.findMany({
        where: {
          workspace_id: {
            in: workspaceIds,
          },
        },
        select: {
          project_id: true,
        },
      });

      const projectIds = projects.map(
        (row) => row.project_id
      );

      await prisma.tasks.deleteMany({
        where: {
          project_id: {
            in: projectIds,
          },
        },
      });

      await prisma.projects.deleteMany({
        where: {
          project_id: {
            in: projectIds,
          },
        },
      });

      await prisma.workspace_memberships.deleteMany({
        where: {
          workspace_id: {
            in: workspaceIds,
          },
        },
      });

      await prisma.workspaces.deleteMany({
        where: {
          workspace_id: {
            in: workspaceIds,
          },
        },
      });

      // Remove only the temporary users.
      await prisma.app_users.deleteMany({
        where: {
          email: {
            in: [emailA, emailB],
          },
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
