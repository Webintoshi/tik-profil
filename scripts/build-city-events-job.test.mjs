import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFile, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

test("compiled city events artifact runs independently and refuses unapproved apply before network", async () => {
  const build = spawnSync(process.execPath, ["scripts/build-city-events-job.mjs"], { cwd: process.cwd(), encoding: "utf8" });
  assert.equal(build.status, 0, build.stderr);
  const artifact = path.join(process.cwd(), "dist/jobs/sync-ordu-events.cjs");
  const contents = await readFile(artifact, "utf8");
  assert.doesNotMatch(contents, /CITY_EVENTS_PUBLISHED_SOURCES\s*[:=]\s*["'][^"']+/);

  const isolated = await mkdtemp(path.join(tmpdir(), "tikprofil-events-job-"));
  const copiedArtifact = path.join(isolated, "sync-ordu-events.cjs");
  await copyFile(artifact, copiedArtifact);
  const help = spawnSync(process.execPath, [copiedArtifact, "--help"], { cwd: isolated, encoding: "utf8" });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /Usage:/);
  const refused = spawnSync(process.execPath, [copiedArtifact, "--apply", "--source=biletinial"], {
    cwd: isolated, env: { ...process.env, CITY_EVENTS_PUBLISHED_SOURCES: "" }, encoding: "utf8",
  });
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /Publication permission required/i);
  assert.doesNotMatch(refused.stderr, /ECONN|DATABASE_URL|node_modules|tsx/i);
});
