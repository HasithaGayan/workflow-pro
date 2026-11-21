
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";

test("Day 44 task write API", async (t) => {
  const server = app.listen(0, "127.0.0.1");

  let createdId: number | null = null;

  try {
    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });

    const address = server.address() as AddressInfo;
    const base = `http://127.0.0.1:${address.port}`;

    const post = (body: unknown) =>
      fetch(`${base}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

    await t.test("Reject empty task title", async () => {
      const response = await post({
        projectId: "1",
        title: "   ",
      });

      assert.equal(response.status, 400);
    });

    await t.test("Reject nonexistent project", async () => {
      const response = await post({
        projectId: "999999",
        title: "Invalid project task",
      });

      assert.equal(response.status, 404);
    });

    await t.test("Reject nonmember assignment", async () => {
      const response = await post({
        projectId: "1",
        title: "Invalid assignment",
        assignedUserId: "999999",
      });

      assert.equal(response.status, 422);
    });

    await t.test("Create a real database task", async () => {
      const response = await post({
        projectId: "1",
        title: `Day 44 Test ${randomUUID()}`,
        assignedUserId: "2",
        status: "todo",
        priority: "high",
        dueDate: "2026-12-05",
      });

      assert.equal(response.status, 201);

      const body = await response.json();

      assert.equal(body.success, true);
      assert.equal(body.data.status, "todo");
      assert.equal(body.data.assignedUserId, "2");

      createdId = body.data.id;
      assert.ok(Number.isSafeInteger(createdId));
    });

    await t.test("Update task progress", async () => {
      assert.notEqual(createdId, null);

      const response = await fetch(
        `${base}/api/tasks/${createdId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "in_progress",
          }),
        }
      );

      assert.equal(response.status, 200);

      const body = await response.json();

      assert.equal(body.data.status, "in_progress");
    });

    await t.test("Reject invalid status", async () => {
      const response = await fetch(
        `${base}/api/tasks/${createdId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "finished_forever",
          }),
        }
      );

      assert.equal(response.status, 400);
    });

    await t.test("Read back the updated task", async () => {
      const response = await fetch(
        `${base}/api/tasks/${createdId}`
      );

      assert.equal(response.status, 200);

      const body = await response.json();

      assert.equal(body.data.status, "in_progress");
      assert.equal(body.data.priority, "high");
    });
  } finally {
    // Clean up only the new test record.
    try {
      if (createdId !== null) {
        await prisma.tasks.deleteMany({
          where: { task_id: BigInt(createdId) },
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
