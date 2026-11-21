
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import {
  createAuthenticatedClient,
} from "./helpers/authFixture";

test("Day 45 workspace and project API", async (t) => {
  const client = await createAuthenticatedClient();

  let workspaceId = "";
  let projectId = "";

  const workspaceName = `Day47 Test ${randomUUID()}`;
  const projectName = "Test Project";

  try {
    await t.test(
      "Reject blank workspace name",
      async () => {
        const response = await client.request(
          "POST",
          "/api/workspaces",
          { name: " " }
        );

        assert.equal(response.status, 400);
      }
    );

    await t.test(
      "Create workspace",
      async () => {
        const response = await client.request(
          "POST",
          "/api/workspaces",
          { name: workspaceName }
        );

        assert.equal(response.status, 201);

        const body = await response.json();
        workspaceId = body.data.id;

        client.trackWorkspace(workspaceId);

        assert.equal(
          body.data.name,
          workspaceName
        );
      }
    );

    await t.test(
      "List workspaces",
      async () => {
        const response = await client.request(
          "GET",
          "/api/workspaces"
        );

        assert.equal(response.status, 200);

        const body = await response.json();

        assert.ok(
          body.data.some(
            (workspace: { id: string }) =>
              workspace.id === workspaceId
          )
        );
      }
    );

    await t.test(
      "Create project",
      async () => {
        const response = await client.request(
          "POST",
          "/api/projects",
          {
            workspaceId,
            name: projectName,
          }
        );

        assert.equal(response.status, 201);

        const body = await response.json();
        projectId = body.data.id;

        assert.equal(
          body.data.workspaceId,
          workspaceId
        );
      }
    );

    await t.test(
      "Reject duplicate project",
      async () => {
        const response = await client.request(
          "POST",
          "/api/projects",
          {
            workspaceId,
            name: projectName,
          }
        );

        assert.equal(response.status, 409);
      }
    );

    await t.test(
      "List workspace projects",
      async () => {
        const response = await client.request(
          "GET",
          `/api/workspaces/${workspaceId}/projects`
        );

        assert.equal(response.status, 200);

        const body = await response.json();

        assert.equal(body.count, 1);
        assert.equal(
          body.data[0].name,
          projectName
        );
      }
    );

    await t.test(
      "New project has no tasks",
      async () => {
        const response = await client.request(
          "GET",
          `/api/projects/${projectId}/tasks`
        );

        assert.equal(response.status, 200);

        const body = await response.json();

        assert.equal(body.count, 0);
        assert.deepEqual(body.data, []);
      }
    );

    await t.test(
      "Reject invalid workspace ID",
      async () => {
        const response = await client.request(
          "GET",
          "/api/workspaces/abc/projects"
        );

        assert.equal(response.status, 400);
      }
    );

    await t.test(
      "Missing workspace returns 404",
      async () => {
        const response = await client.request(
          "GET",
          "/api/workspaces/999999/projects"
        );

        assert.equal(response.status, 404);
      }
    );

    await t.test(
      "Missing project returns 404",
      async () => {
        const response = await client.request(
          "GET",
          "/api/projects/999999/tasks"
        );

        assert.equal(response.status, 404);
      }
    );

    await t.test(
      "Reject invalid project creation",
      async () => {
        const response = await client.request(
          "POST",
          "/api/projects",
          {
            workspaceId: "999999",
            name: "Missing Workspace Project",
          }
        );

        assert.equal(response.status, 404);
      }
    );
  } finally {
    await client.close();
  }
});
