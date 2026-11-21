
import assert from "node:assert/strict";
import test from "node:test";

import {
  createAuthenticatedClient,
} from "./helpers/authFixture";

test("WorkFlow Pro database-backed API", async (t) => {
  const client = await createAuthenticatedClient();

  try {
    const workspaceId = await client.createWorkspace();
    const projectId = await client.createProject(
      workspaceId
    );

    const created = await client.request(
      "POST",
      "/api/tasks",
      {
        projectId,
        title: "Read API Regression Task",
        status: "todo",
        priority: "medium",
      }
    );

    assert.equal(created.status, 201);

    const createdBody = await created.json();
    const taskId: number = createdBody.data.id;

    await t.test(
      "Health endpoint returns 200",
      async () => {
        const response = await client.request(
          "GET",
          "/api/health"
        );

        assert.equal(response.status, 200);
      }
    );

    await t.test(
      "Tasks come from PostgreSQL",
      async () => {
        const response = await client.request(
          "GET",
          "/api/tasks"
        );

        assert.equal(response.status, 200);

        const body = await response.json();

        assert.ok(
          body.data.some(
            (task: { id: number }) =>
              task.id === taskId
          )
        );
      }
    );

    await t.test(
      "Find an existing task",
      async () => {
        const response = await client.request(
          "GET",
          `/api/tasks/${taskId}`
        );

        assert.equal(response.status, 200);

        const body = await response.json();
        assert.equal(body.data.id, taskId);
      }
    );

    await t.test(
      "Invalid ID returns 400",
      async () => {
        const response = await client.request(
          "GET",
          "/api/tasks/abc"
        );

        assert.equal(response.status, 400);
      }
    );

    await t.test(
      "Missing task returns 404",
      async () => {
        const response = await client.request(
          "GET",
          "/api/tasks/999999"
        );

        assert.equal(response.status, 404);
      }
    );

    await t.test(
      "Unknown route returns 404",
      async () => {
        const response = await client.request(
          "GET",
          "/api/unknown"
        );

        assert.equal(response.status, 404);
      }
    );
  } finally {
    await client.close();
  }
});
