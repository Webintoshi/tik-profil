/// <reference types="node" />

import assert from "node:assert/strict";
import type { ChildProcess } from "node:child_process";
import test from "node:test";

const {
  cleanupBrowserTestProcesses,
  getFreePort,
  spawnManagedNode,
  waitForUrl
}: typeof import("../../scripts/browser-test-processes.mjs") = await import(
  new URL("../../scripts/browser-test-processes.mjs", import.meta.url).href
);

test("browser harness releases its child port after an early failure", async () => {
  const port = await getFreePort();
  const children: ChildProcess[] = [];
  const child = spawnManagedNode([
    "-e",
    "require('node:http').createServer((_,res)=>res.end('ok')).listen(Number(process.argv[1]),'127.0.0.1')",
    String(port)
  ]);
  children.push(child);

  await assert.rejects(async () => {
    try {
      await waitForUrl(`http://127.0.0.1:${port}`, 5_000);
      throw new Error("deterministic early browser failure");
    } finally {
      await cleanupBrowserTestProcesses(children, [port]);
    }
  }, /deterministic early browser failure/);

  const rebound = await getFreePort(port);
  assert.equal(rebound, port);
});
