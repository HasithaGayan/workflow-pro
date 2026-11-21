
import assert from "node:assert/strict";
import test from "node:test";

import {
  createAuthenticatedClient,
} from "./helpers/authFixture";

test("Day 44 task write API", async (t) => {
  const client = await createAuthenticatedClient();

  let createdTaskId: number | null = null;

  try {
    const workspaceId = await client.createWorkspace();
    const projectId = await client.createProject(
      workspaceId
    );

    await t.test(
      "Reject empty task title",
      async () => {
        const response = await client.request(
          "POST",
          "/api/tasks",
          {
            projectId,
            title: " ",
          }
        );

        assert.equal(response.status, 400);
      }
    );

    await t.test(
      "Reject nonexistent project",
      async () => {
        const response = await client.request(
          "POST",
          "/api/tasks",
          {
            projectId: "999999",
            title: "Missing Project Task",
          }
        );

        assert.equal(response.status, 404);
      }
    );

    await t.test(
      "Reject nonmember assignment",
      async () => {
        const response = await client.request(
          "POST",
          "/api/tasks",
          {
            projectId,
            title: "Invalid Assignment",
            assignedUserId: "999999",
          }
        );

        assert.equal(response.status, 422);
      }
    );

    await t.test(
      "Create a real database task",
      async () => {
        const response = await client.request(
          "POST",
          "/api/tasks",
          {
            projectId,
            title: "Day 47 Regression Task",
            assignedUserId: client.userId,
            status: "todo",
            priority: "high",
            dueDate: "2026-12-05",
          }
        );

        assert.equal(response.status, 201);

        const body = await response.json();

        createdTaskId = body.data.id;
        assert.ok(createdTaskId);
      }
    );

    await t.test(
      "Update task progress",
      async () => {
        assert.notEqual(createdTaskId, null);

        const response = await client.request(
          "PATCH",
          `/api/tasks/${createdTaskId}`,
          { status: "in_progress" }
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
      "Reject invalid status",
      async () => {
        assert.notEqual(createdTaskId, null);

        const response = await client.request(
          "PATCH",
          `/api/tasks/${createdTaskId}`,
          { status: "invalid_status" }
        );

        assert.equal(response.status, 400);
      }
    );

    await t.test(
      "Read back the updated task",
      async () => {
        assert.notEqual(createdTaskId, null);

        const response = await client.request(
          "GET",
          `/api/tasks/${createdTaskId}`
        );

        assert.equal(response.status, 200);

        const body = await response.json();

        assert.equal(
          body.data.status,
          "in_progress"
        );

        assert.equal(
          body.data.id,
          createdTaskId
        );
      }
    );
  } finally {
    await client.close();
  }
});
