
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import type { AddressInfo } from "node:net";

import { app } from "../../src/app";
import { prisma } from "../../src/lib/prisma";

export async function createAuthenticatedClient() {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${address.port}`;

  const email = `regression.${randomUUID()}@example.com`;
  const password = "Regression-Strong-Password-2026!";

  const workspaceIds: bigint[] = [];
  let cookie = "";

  try {
    // Register a temporary test account.
    const registration = await fetch(
      `${base}/api/auth/register`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: "Regression Test User",
          email,
          password,
        }),
      }
    );

    assert.equal(registration.status, 201);

    const registered = await registration.json();
    const userId: string = registered.data.id;

    // Log in to obtain a real session cookie.
    const login = await fetch(
      `${base}/api/auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      }
    );

    assert.equal(login.status, 200);

    cookie =
      login.headers.get("set-cookie")
        ?.split(";")[0] ?? "";

    assert.ok(cookie, "Session cookie is missing");

    // Reusable authenticated API request.
    // Automatically fetch a CSRF token for writes.
    async function request(
      method: string,
      path: string,
      body?: unknown
    ): Promise<Response> {
      const isWrite = ![
        "GET",
        "HEAD",
        "OPTIONS",
      ].includes(method.toUpperCase());

      let csrfToken: string | undefined;

      if (isWrite) {
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
          Cookie: cookie,

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

    // Track only workspaces created by this test.
    function trackWorkspace(id: string): void {
      workspaceIds.push(BigInt(id));
    }

    async function createWorkspace(): Promise<string> {
      const response = await request(
        "POST",
        "/api/workspaces",
        {
          name: `Regression Workspace ${randomUUID()}`,
        }
      );

      assert.equal(response.status, 201);

      const body = await response.json();
      const id: string = body.data.id;

      trackWorkspace(id);

      return id;
    }

    async function createProject(
      workspaceId: string
    ): Promise<string> {
      const response = await request(
        "POST",
        "/api/projects",
        {
          workspaceId,
          name: `Regression Project ${randomUUID()}`,
        }
      );

      assert.equal(response.status, 201);

      const body = await response.json();

      return body.data.id;
    }

    // Delete only this test's temporary data.
    async function close(): Promise<void> {
      try {
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

        // PostgreSQL cascades credentials and sessions.
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

    return {
      userId,
      email,
      request,
      trackWorkspace,
      createWorkspace,
      createProject,
      close,
    };
  } catch (error) {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });

    await prisma.$disconnect();

    throw error;
  }
}
