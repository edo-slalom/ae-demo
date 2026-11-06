import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 3999;
const BASE = `http://localhost:${PORT}`;

let server;

before(async () => {
  server = spawn("node", ["server.js"], {
    env: { ...process.env, PORT: String(PORT) },
    cwd: __dirname + "/..",
    stdio: "pipe",
  });
  await sleep(600);
});

after(() => server?.kill());

test("GET /health returns ok", async () => {
  const res = await fetch(`${BASE}/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, "ok");
});

test("POST /returns/lookup with valid order returns eligibility", async () => {
  const res = await fetch(`${BASE}/returns/lookup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderNumber: "ORD-1001", email: "alice@example.com" }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.eligible, true);
  assert.ok(typeof body.daysRemaining === "number");
});

test("POST /returns/lookup with unknown order returns 404", async () => {
  const res = await fetch(`${BASE}/returns/lookup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderNumber: "ORD-9999", email: "x@x.com" }),
  });
  assert.equal(res.status, 404);
});

test("POST /returns creates return authorization", async () => {
  const res = await fetch(`${BASE}/returns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderNumber: "ORD-1001",
      email: "alice@example.com",
      items: [{ id: "ITEM-A", name: "Wireless Headphones", qty: 1, price: 89.99 }],
      reason: "Defective product",
    }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.ok(body.id.startsWith("RA-"));
  assert.ok(body.shippingLabel.includes(body.id));
});

test("GET /admin/returns returns array", async () => {
  const res = await fetch(`${BASE}/admin/returns`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body));
});
