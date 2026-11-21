
import test from "node:test";
import assert from "node:assert/strict";

const frontend = "http://localhost:3000";
const backend = "http://127.0.0.1:4000";

async function request(url, options = {}) {
  try {
    return await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(10000),
      redirect: "manual",
    });
  } catch (error) {
    throw new Error(
      `Cannot connect to ${url}. Check that both servers are running.`,
      { cause: error }
    );
  }
}

async function expectStatus(url, expected, options) {
  const response = await request(url, options);

  assert.equal(
    response.status,
    expected,
    `Expected HTTP ${expected}, received ${response.status}: ${url}`
  );

  return response;
}

test("Day 56 full-stack smoke tests", async (t) => {
  await t.test("Backend health is working", async () => {
    const response = await expectStatus(
      `${backend}/api/health`,
      200
    );

    const result = await response.json();

    assert.equal(result.status, "ok");
  });

  await t.test("Login page loads", async () => {
    await expectStatus(`${frontend}/login`, 200);
  });

  await t.test("Registration page loads", async () => {
    await expectStatus(`${frontend}/register`, 200);
  });

  await t.test("Dashboard page loads", async () => {
    await expectStatus(`${frontend}/dashboard`, 200);
  });

  await t.test("Projects page loads", async () => {
    await expectStatus(`${frontend}/projects`, 200);
  });

  await t.test("Kanban board loads", async () => {
    await expectStatus(`${frontend}/projects/board`, 200);
  });

  await t.test("Task insights page loads", async () => {
    await expectStatus(
      `${frontend}/projects/insights`,
      200
    );
  });

  await t.test("Team management page loads", async () => {
    await expectStatus(`${frontend}/team`, 200);
  });

  await t.test(
    "Backend rejects anonymous team access",
    async () => {
      await expectStatus(
        `${backend}/api/team-members/39`,
        401
      );
    }
  );

  await t.test(
    "Frontend API rejects anonymous profile access",
    async () => {
      const response = await expectStatus(
        `${frontend}/api/workflow/auth/me`,
        401
      );

      assert.equal(
        response.headers.get("cache-control"),
        "no-store"
      );
    }
  );

  await t.test(
    "Frontend API rejects anonymous workspace access",
    async () => {
      await expectStatus(
        `${frontend}/api/workflow/workspaces`,
        401
      );
    }
  );

  await t.test(
    "Frontend API rejects anonymous team access",
    async () => {
      await expectStatus(
        `${frontend}/api/workflow/team-members/39`,
        401
      );
    }
  );

  await t.test(
    "Unknown API routes are rejected",
    async () => {
      await expectStatus(
        `${frontend}/api/workflow/not-a-real-route`,
        404
      );
    }
  );

  await t.test(
    "Cross-origin workspace creation is rejected",
    async () => {
      await expectStatus(
        `${frontend}/api/workflow/workspaces`,
        403,
        {
          method: "POST",
          headers: {
            Origin: "https://untrusted.example",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "Forbidden Workspace",
          }),
        }
      );
    }
  );
});
