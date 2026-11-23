import assert from "node:assert/strict";
import test from "node:test";

// Day 81 integration tests for the LOCAL Docker Compose stack.
// Unlike Day 56's dev-server tests, the Express API is intentionally private.
const BASE = "http://127.0.0.1:3081";

async function getResponse(path, options = {}) {
  return fetch(`${BASE}${path}`, {
    signal: AbortSignal.timeout(20000),
    redirect: "manual",
    ...options,
  });
}

async function expectStatus(path, status, options) {
  const response = await getResponse(path, options);
  assert.equal(response.status, status, `${path}: expected HTTP ${status}, received ${response.status}`);
  return response;
}

test("Day81 Docker: public pages load", async (t) => {
  for (const path of ["/login", "/register"]) {
    await t.test(`${path} returns 200`, async () => {
      await expectStatus(path, 200);
    });
  }
});

test("Day81 Docker: anonymous requests cannot read private data", async (t) => {
  for (const path of [
    "/api/workflow/auth/me",
    "/api/workflow/workspaces",
    "/api/workflow/team-members/39",
  ]) {
    await t.test(`${path} returns 401`, async () => {
      const response = await expectStatus(path, 401);
      assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    });
  }
});

test("Day81 Docker: unknown API route is rejected", async () => {
  await expectStatus("/api/workflow/not-a-real-route", 404);
});

test("Day81 Docker: malicious foreign origin is blocked", async () => {
  const response = await expectStatus("/api/workflow/workspaces", 403, {
    method: "POST",
    headers: {
      Origin: "https://untrusted.example",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: "Do Not Create" }),
  });
  const body = await response.json();
  assert.equal(body?.error, "Untrusted request origin");
});

test("Day81 Docker: trusted local origin reaches validation without creating an account", async () => {
  const response = await getResponse("/api/workflow/auth/register", {
    method: "POST",
    headers: {
      Origin: BASE,
      "Content-Type": "application/json",
    },
    body: "{}", // Invalid fields: must not create a user.
  });
  assert.ok([400, 422].includes(response.status),
    `Expected input validation 400/422, got ${response.status}`);
});
