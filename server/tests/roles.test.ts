
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";

test("Day 47 workspace role permissions", async (t) => {
  const server = app.listen(0, "127.0.0.1");

  const unique = randomUUID();
  const password = "RoleTest-Strong-Password-2026!";

  const emails = {
    owner: `role.owner.${unique}@example.com`,
    admin: `role.admin.${unique}@example.com`,
    member: `role.member.${unique}@example.com`,
    outsider: `role.outsider.${unique}@example.com`,
  };

  let workspaceId: string | null = null;
  let projectId: string | null = null;
  let taskId: number | null = null;

  try {
    await once(server, "listening");

    const address = server.address() as AddressInfo;
    const base = `http://127.0.0.1:${address.port}`;

    // Automatically request CSRF tokens for
    // authenticated writes. Public registration
    // and login do not require session-bound CSRF.
    async function request(
      method: string,
      path: string,
      cookie?: string,
      body?: unknown
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
          ...(cookie
            ? { Cookie: cookie }
            : {}),

          ...(csrfToken
            ? { "X-CSRF-Token": csrfToken }
            : {}),

          ...(body !== undefined
            ? {
                "Content-Type": "application/json",
              }
            : {}),
        },

        ...(body !== undefined
          ? {
              body: JSON.stringify(body),
            }
          : {}),
      });
    }

    async function createAccount(
      fullName: string,
      email: string
    ): Promise<{
      id: string;
      cookie: string;
    }> {
      const registration = await request(
        "POST",
        "/api/auth/register",
        undefined,
        {
          fullName,
          email,
          password,
        }
      );

      assert.equal(registration.status, 201);

      const registered = await registration.json();
      const id: string = registered.data.id;

      const login = await request(
        "POST",
        "/api/auth/login",
        undefined,
        {
          email,
          password,
        }
      );

      assert.equal(login.status, 200);

      const cookie = login.headers
        .get("set-cookie")
        ?.split(";")[0];

      assert.ok(cookie, "Session cookie not found");

      return {
        id,
        cookie,
      };
    }

    // Four distinct temporary users.
    const owner = await createAccount(
      "Role Test Owner",
      emails.owner
    );

    const admin = await createAccount(
      "Role Test Admin",
      emails.admin
    );

    const member = await createAccount(
      "Role Test Member",
      emails.member
    );

    const outsider = await createAccount(
      "Role Test Outsider",
      emails.outsider
    );

    // Owner creates a workspace.
    const workspaceResponse = await request(
      "POST",
      "/api/workspaces",
      owner.cookie,
      {
        name: `Role Test Workspace ${unique}`,
      }
    );

    assert.equal(workspaceResponse.status, 201);

    const workspaceBody =
      await workspaceResponse.json();

    workspaceId = workspaceBody.data.id;

    assert.ok(workspaceId);

    // Prepare role fixtures directly in PostgreSQL.
    // We haven't built an invitation API yet.
    await prisma.workspace_memberships.createMany({
      data: [
        {
          workspace_id: BigInt(workspaceId),
          user_id: BigInt(admin.id),
          role: "admin",
        },
        {
          workspace_id: BigInt(workspaceId),
          user_id: BigInt(member.id),
          role: "member",
        },
      ],
    });

    await t.test(
      "Anonymous user cannot create a project",
      async () => {
        const response = await request(
          "POST",
          "/api/projects",
          undefined,
          {
            workspaceId,
            name: "Anonymous Project",
          }
        );

        assert.equal(response.status, 401);
      }
    );

    await t.test(
      "Owner can create a project",
      async () => {
        const response = await request(
          "POST",
          "/api/projects",
          owner.cookie,
          {
            workspaceId,
            name: "Owner Project",
          }
        );

        assert.equal(response.status, 201);

        const body = await response.json();

        projectId = body.data.id;

        assert.ok(projectId);
      }
    );

    await t.test(
      "Admin can create a project",
      async () => {
        const response = await request(
          "POST",
          "/api/projects",
          admin.cookie,
          {
            workspaceId,
            name: "Admin Project",
          }
        );

        assert.equal(response.status, 201);
      }
    );

    await t.test(
      "Member cannot create a project",
      async () => {
        const response = await request(
          "POST",
          "/api/projects",
          member.cookie,
          {
            workspaceId,
            name: "Member Project",
          }
        );

        assert.equal(response.status, 403);
      }
    );

    await t.test(
      "Nonmember cannot create a project",
      async () => {
        const response = await request(
          "POST",
          "/api/projects",
          outsider.cookie,
          {
            workspaceId,
            name: "Outsider Project",
          }
        );

        assert.equal(response.status, 404);
      }
    );

    await t.test(
      "Member can view workspace projects",
      async () => {
        const response = await request(
          "GET",
          `/api/workspaces/${workspaceId}/projects`,
          member.cookie
        );

        assert.equal(response.status, 200);

        const body = await response.json();

        assert.ok(
          body.data.some(
            (project: { id: string }) =>
              project.id === projectId
          )
        );
      }
    );

    await t.test(
      "Nonmember cannot view workspace projects",
      async () => {
        const response = await request(
          "GET",
          `/api/workspaces/${workspaceId}/projects`,
          outsider.cookie
        );

        assert.equal(response.status, 404);
      }
    );

    await t.test(
      "Owner can create a task",
      async () => {
        const response = await request(
          "POST",
          "/api/tasks",
          owner.cookie,
          {
            projectId,
            title: "Role Permission Test Task",
            status: "todo",
          }
        );

        assert.equal(response.status, 201);

        const body = await response.json();

        taskId = body.data.id;

        assert.ok(taskId);
      }
    );

    await t.test(
      "Admin can update a workspace task",
      async () => {
        const response = await request(
          "PATCH",
          `/api/tasks/${taskId}`,
          admin.cookie,
          {
            status: "in_progress",
          }
        );

        assert.equal(response.status, 200);

        const body = await response.json();

        assert.equal(
          body.data.status,
          "in_progress"
        );
      }
    );

    await t.test(
      "Member can read and update a workspace task",
      async () => {
        const read = await request(
          "GET",
          `/api/tasks/${taskId}`,
          member.cookie
        );

        assert.equal(read.status, 200);

        const update = await request(
          "PATCH",
          `/api/tasks/${taskId}`,
          member.cookie,
          {
            status: "done",
          }
        );

        assert.equal(update.status, 200);

        const body = await update.json();

        assert.equal(
          body.data.status,
          "done"
        );
      }
    );

    await t.test(
      "Nonmember cannot read or update a private task",
      async () => {
        const read = await request(
          "GET",
          `/api/tasks/${taskId}`,
          outsider.cookie
        );

        assert.equal(read.status, 404);

        const update = await request(
          "PATCH",
          `/api/tasks/${taskId}`,
          outsider.cookie,
          {
            status: "todo",
          }
        );

        assert.equal(update.status, 404);
      }
    );

    await t.test(
      "Removing membership immediately revokes access",
      async () => {
        await prisma.workspace_memberships.deleteMany({
          where: {
            workspace_id: BigInt(workspaceId!),
            user_id: BigInt(member.id),
          },
        });

        const response = await request(
          "GET",
          `/api/tasks/${taskId}`,
          member.cookie
        );

        assert.equal(response.status, 404);
      }
    );
  } finally {
    try {
      // Remove only this unique test workspace.
      if (workspaceId !== null) {
        const id = BigInt(workspaceId);

        const projects = await prisma.projects.findMany({
          where: {
            workspace_id: id,
          },
          select: {
            project_id: true,
          },
        });

        const projectIds = projects.map(
          (project) => project.project_id
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
            workspace_id: id,
          },
        });

        await prisma.workspace_memberships.deleteMany({
          where: {
            workspace_id: id,
          },
        });

        await prisma.workspaces.deleteMany({
          where: {
            workspace_id: id,
          },
        });
      }

      // Delete only the four temporary user accounts.
      await prisma.app_users.deleteMany({
        where: {
          email: {
            in: Object.values(emails),
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
