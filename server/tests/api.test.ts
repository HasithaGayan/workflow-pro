
import assert from "node:assert/strict";
import test from "node:test";
import type { AddressInfo } from "node:net";
import { app } from "../src/app";

test("WorkFlow Pro API", async (t) => {
  // Port 0 lets the operating system choose a free port.
  const server = app.listen(0, "127.0.0.1");

  try {
    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });

    const address = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${address.port}`;

    await t.test("Health returns HTTP 200", async () => {
      const response = await fetch(`${baseUrl}/api/health`);
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.status, "ok");
      assert.ok(response.headers.get("x-request-id"));
    });

    await t.test("Tasks list returns 3 tasks", async () => {
      const response = await fetch(`${baseUrl}/api/tasks`);
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.count, 3);
      assert.equal(body.data.length, 3);
    });

    await t.test("Existing task returns details", async () => {
      const response = await fetch(`${baseUrl}/api/tasks/2`);
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.data.id, 2);
      assert.equal(body.data.status, "in_progress");
    });

    await t.test("Invalid ID returns HTTP 400", async () => {
      const response = await fetch(`${baseUrl}/api/tasks/abc`);
      const body = await response.json();

      assert.equal(response.status, 400);
      assert.equal(body.success, false);
    });

    await t.test("Missing task returns HTTP 404", async () => {
      const response = await fetch(`${baseUrl}/api/tasks/999`);

      assert.equal(response.status, 404);
    });

    await t.test("Unknown route returns HTTP 404", async () => {
      const response = await fetch(`${baseUrl}/api/unknown`);

      assert.equal(response.status, 404);
    });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
});
