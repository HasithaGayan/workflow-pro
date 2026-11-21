
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";

test("Day 45 workspace and project API", async (t) => {
  const server = app.listen(0, "127.0.0.1");

  let workspaceId: string | null = null;
  let projectId: string | null = null;

  const workspaceName =
    `Day 45 Workspace ${randomUUID().slice(0, 8)}`;
  const projectName = "Day 45 Test Project";

  try {
    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });

    const address = server.address() as AddressInfo;
    const base = `http://127.0.0.1:${address.port}`;

    const post = (path: string, body: unknown) =>
      fetch(`${base}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

    await t.test("Reject blank workspace name", async () => {
      const response = await post(
        "/api/workspaces",
        { name: " " }
      );

      assert.equal(response.status, 400);
    });

    await t.test("Create workspace", async () => {
      const response = await post(
        "/api/workspaces",
        { name: workspaceName }
      );

      assert.equal(response.status, 201);

      const body = await response.json();
      assert.equal(body.success, true);
      assert.equal(body.data.name, workspaceName);

      workspaceId = body.data.id;
      assert.ok(workspaceId);
    });

    await t.test("List workspaces", async () => {
      const response = await fetch(
        `${base}/api/workspaces`
      );

      assert.equal(response.status, 200);

      const body = await response.json();
      assert.equal(body.success, true);

      assert.ok(
        body.data.some(
          (workspace: { id: string }) =>
            workspace.id === workspaceId
        )
      );
    });

    await t.test("Create project", async () => {
      assert.ok(workspaceId);

      const response = await post("/api/projects", {
        workspaceId,
        name: projectName,
      });

      assert.equal(response.status, 201);

      const body = await response.json();
      assert.equal(body.success, true);
      assert.equal(body.data.workspaceId, workspaceId);

      projectId = body.data.id;
      assert.ok(projectId);
    });

    await t.test("Reject duplicate project", async () => {
      const response = await post("/api/projects", {
        workspaceId,
        name: projectName,
      });

      assert.equal(response.status, 409);
    });

    await t.test("List workspace projects", async () => {
      const response = await fetch(
        `${base}/api/workspaces/${workspaceId}/projects`
      );

      assert.equal(response.status, 200);

      const body = await response.json();
      assert.equal(body.count, 1);
      assert.equal(body.data[0].name, projectName);
    });

    await t.test("New project has no tasks", async () => {
      const response = await fetch(
        `${base}/api/projects/${projectId}/tasks`
      );

      assert.equal(response.status, 200);

      const body = await response.json();
      assert.equal(body.count, 0);
      assert.deepEqual(body.data, []);
    });

    await t.test("Reject invalid workspace ID", async () => {
      const response = await fetch(
        `${base}/api/workspaces/abc/projects`
      );

      assert.equal(response.status, 400);
    });

    await t.test("Missing workspace returns 404", async () => {
      const response = await fetch(
        `${base}/api/workspaces/999999/projects`
      );

      assert.equal(response.status, 404);
    });

    await t.test("Missing project returns 404", async () => {
      const response = await fetch(
        `${base}/api/projects/999999/tasks`
      );

      assert.equal(response.status, 404);
    });

    await t.test("Reject invalid project creation", async () => {
      const response = await post("/api/projects", {
        workspaceId: "999999",
        name: "Invalid project",
      });

      assert.equal(response.status, 404);
    });
  } finally {
    try {
      // Remove only records created by this test.
      if (projectId !== null) {
        await prisma.projects.deleteMany({
          where: {
            project_id: BigInt(projectId),
          },
        });
      }

      if (workspaceId !== null) {
        await prisma.workspaces.deleteMany({
          where: {
            workspace_id: BigInt(workspaceId),
          },
        });
      }
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
