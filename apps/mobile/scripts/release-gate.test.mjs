import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const rootPackageJson = JSON.parse(readFileSync(new URL("../../../package.json", import.meta.url), "utf8"));

test("root mobile release gate runs every required command in order", () => {
  assert.equal(
    rootPackageJson.scripts?.["mobile:release"],
    "npm run typecheck && npm run mobile:typecheck && npm run mobile:test && npm --prefix apps/mobile run build:apk -- --release"
  );
});

test("root mobile test gate includes the release sidecar script tests", () => {
  assert.match(rootPackageJson.scripts?.["mobile:test"] ?? "", /node --test apps\/mobile\/scripts\/\*\.test\.mjs/);
});
