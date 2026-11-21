
import assert from "node:assert/strict";
import test from "node:test";
import type { AddressInfo } from "node:net";

import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";

test("WorkFlow Pro database-backed API", async (t) => {
  const server = app.listen(0, "127.0.0.1");

  try {
    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });

    const address = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${address.port}`;

    await t.test("Health endpoint returns 200", async () => {
      const response = await fetch(`${baseUrl}/api/health`);
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.status, "ok");
      assert.ok(response.headers.get("x-request-id"));
    });

    await t.test("Tasks come from PostgreSQL", async () => {
      const response = await fetch(`${baseUrl}/api/tasks`);
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.count, 1);
      assert.equal(body.data.length, 1);

      const task = body.data[0];

      assert.equal(task.id, 1);
      assert.equal(task.title, "Design Database");
      assert.equal(task.status, "in_progress");
      assert.equal(task.priority, "high");
      assert.equal(task.projectId, "1");
      assert.equal(task.assignedUserId, "2");
      assert.equal(task.dueDate, "2026-12-01");
    });

    await t.test("Find an existing task", async () => {
      const response = await fetch(`${baseUrl}/api/tasks/1`);
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.title, "Design Database");
    });

    await t.test("Invalid ID returns 400", async () => {
      const response = await fetch(`${baseUrl}/api/tasks/abc`);
      const body = await response.json();

      assert.equal(response.status, 400);
      assert.equal(body.success, false);
      assert.equal(body.error, "Invalid task ID");
    });

    await t.test("Missing task returns 404", async () => {
      const response = await fetch(`${baseUrl}/api/tasks/999`);
      const body = await response.json();

      assert.equal(response.status, 404);
      assert.equal(body.error, "Task not found");
    });

    await t.test("Unknown route returns 404", async () => {
      const response = await fetch(`${baseUrl}/api/unknown`);
      const body = await response.json();

      assert.equal(response.status, 404);
      assert.equal(body.error, "Route not found");
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
});
