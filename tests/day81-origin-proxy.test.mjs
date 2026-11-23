import assert from "node:assert/strict";
import test from "node:test";

const BASE = "http://127.0.0.1:3081";
const ENDPOINT = `${BASE}/api/workflow/auth/register`;

async function registrationProbe(origin, body = "{}") {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Origin": origin, "Content-Type": "application/json" },
    body,
    signal: AbortSignal.timeout(20000),
  });
  return {
    status: response.status,
    payload: await response.json(),
  };
}

test("Day81: legitimate local origin reaches backend registration validation", async () => {
  // Deliberately invalid payload; must not create a user or password.
  const result = await registrationProbe(BASE);
  assert.ok([400, 422].includes(result.status),
    `Expected input validation 400/422, received ${result.status}: ${JSON.stringify(result.payload)}`);
});

test("Day81: an unrelated external origin is still rejected", async () => {
  const result = await registrationProbe("https://untrusted.example");
  assert.equal(result.status, 403);
  assert.equal(result.payload?.error, "Untrusted request origin");
});

test("Day81: login and registration pages remain available", async () => {
  for (const path of ["/login", "/register"]) {
    const response = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(20000) });
    assert.equal(response.status, 200, path);
  }
});

test("Day81: session endpoint remains protected before login", async () => {
  const response = await fetch(`${BASE}/api/workflow/auth/me`, {
    signal: AbortSignal.timeout(20000),
  });
  assert.equal(response.status, 401);
});
