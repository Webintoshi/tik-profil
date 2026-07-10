import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import test from "node:test";

function listen(server) {
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address().port)));
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

async function waitForProxy(url) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
  throw new Error("proxy did not start");
}

test("running proxy gates paths and never leaks denied Authorization", async () => {
  const upstreamRequests = [];
  const upstreamServer = http.createServer((request, response) => {
    upstreamRequests.push({ authorization: request.headers.authorization, url: request.url });
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ success: true }));
  });
  const upstreamPort = await listen(upstreamServer);
  const probeServer = http.createServer();
  const proxyPort = await listen(probeServer);
  await close(probeServer);
  const child = spawn(process.execPath, ["./scripts/dev-admin-api-proxy.mjs"], {
    cwd: new URL("..", import.meta.url),
    env: {
      ...process.env,
      TIKPROFIL_LOCAL_PROXY_PORT: String(proxyPort),
      TIKPROFIL_UPSTREAM_URL: `http://127.0.0.1:${upstreamPort}`
    },
    stdio: "ignore"
  });

  try {
    await waitForProxy(`http://127.0.0.1:${proxyPort}/not-allowed`);
    const denied = await fetch(`http://127.0.0.1:${proxyPort}/api/mobile/accounting`, {
      headers: { Authorization: "Bearer must-not-leak" }
    });
    assert.equal(denied.status, 404);
    assert.equal(upstreamRequests.length, 0);

    const publicResponse = await fetch(`http://127.0.0.1:${proxyPort}/api/kesfet/search?q=burger`, {
      headers: { Authorization: "Bearer public-must-strip" }
    });
    assert.equal(publicResponse.status, 200);
    assert.deepEqual(upstreamRequests, [{ authorization: undefined, url: "/api/kesfet/search?q=burger" }]);

    const allowed = await fetch(`http://127.0.0.1:${proxyPort}/api/mobile/account/avatar`, {
      body: JSON.stringify({}),
      headers: { Authorization: "Bearer exact.token", "Content-Type": "application/json" },
      method: "POST"
    });
    assert.equal(allowed.status, 200);
    assert.deepEqual(upstreamRequests, [
      { authorization: undefined, url: "/api/kesfet/search?q=burger" },
      { authorization: "Bearer exact.token", url: "/api/mobile/account/avatar" }
    ]);
  } finally {
    child.kill();
    await close(upstreamServer);
  }
});
