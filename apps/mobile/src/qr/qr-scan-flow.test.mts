/// <reference types="node" />

import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".ts")) {
      return nextLoad(url, { ...context, format: "module-typescript" });
    }
    return nextLoad(url, context);
  },
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !specifier.endsWith(".ts")) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  }
});

const { processQrScan }: typeof import("./qr-scan-flow") = await import(
  new URL("./qr-scan-flow.ts", import.meta.url).href
);

test("QR flow resolves before one best-effort log and one replace", async () => {
  const events: string[] = [];
  const result = await processQrScan("ordu-kahve", {
    fetchProfile: async (slug) => {
      events.push(`resolve:${slug}`);
      return { success: true, profile: { id: "business-1", slug }, redirectTarget: null };
    },
    logScan: async (business) => {
      events.push(`log:${business.id}:${business.slug}`);
      await new Promise(() => undefined);
    },
    replace: (href) => events.push(`replace:${href}`)
  });

  assert.deepEqual(result, { status: "navigated", slug: "ordu-kahve" });
  assert.deepEqual(events, [
    "resolve:ordu-kahve",
    "log:business-1:ordu-kahve",
    "replace:/business/ordu-kahve"
  ]);
});

test("QR flow follows one canonical previous-slug redirect", async () => {
  const resolved: string[] = [];
  const replaced: string[] = [];
  const result = await processQrScan("old-slug", {
    fetchProfile: async (slug) => {
      resolved.push(slug);
      return slug === "old-slug"
        ? { success: true, profile: null, redirectTarget: "new-slug" }
        : { success: true, profile: { id: "business-2", slug: "new-slug" }, redirectTarget: null };
    },
    logScan: () => undefined,
    replace: (href) => replaced.push(href)
  });

  assert.deepEqual(resolved, ["old-slug", "new-slug"]);
  assert.deepEqual(replaced, ["/business/new-slug"]);
  assert.deepEqual(result, { status: "navigated", slug: "new-slug" });
});

test("QR flow rejects invalid redirects and never follows more than once", async () => {
  for (const redirectTarget of ["Uppercase", "https://tikprofil.com/new-slug", "old-slug"]) {
    let fetchCount = 0;
    let logCount = 0;
    let replaceCount = 0;
    const result = await processQrScan("old-slug", {
      fetchProfile: async () => {
        fetchCount += 1;
        return { success: true, profile: null, redirectTarget };
      },
      logScan: () => { logCount += 1; },
      replace: () => { replaceCount += 1; }
    });

    assert.equal(result.status, "unresolved", redirectTarget);
    assert.equal(fetchCount, 1, redirectTarget);
    assert.equal(logCount, 0, redirectTarget);
    assert.equal(replaceCount, 0, redirectTarget);
  }

  let fetchCount = 0;
  const secondRedirect = await processQrScan("old-slug", {
    fetchProfile: async (slug) => {
      fetchCount += 1;
      return { success: true, profile: null, redirectTarget: slug === "old-slug" ? "new-slug" : "third-slug" };
    },
    logScan: () => assert.fail("unresolved profile must not be logged"),
    replace: () => assert.fail("unresolved profile must not navigate")
  });
  assert.equal(secondRedirect.status, "unresolved");
  assert.equal(fetchCount, 2);
});

test("QR flow does not resolve invalid targets or log unresolved profiles", async () => {
  let fetchCount = 0;
  let logCount = 0;
  let replaceCount = 0;
  const dependencies = {
    fetchProfile: async () => {
      fetchCount += 1;
      return { success: false, profile: null, redirectTarget: null };
    },
    logScan: () => { logCount += 1; },
    replace: () => { replaceCount += 1; }
  };

  assert.deepEqual(await processQrScan("https://evil.example/profile", dependencies), { status: "invalid" });
  assert.deepEqual(await processQrScan("missing-profile", dependencies), { status: "unresolved" });
  assert.equal(fetchCount, 1);
  assert.equal(logCount, 0);
  assert.equal(replaceCount, 0);
});

test("QR flow ignores stale async completion", async () => {
  let active = true;
  let logCount = 0;
  let replaceCount = 0;
  const result = await processQrScan("ordu-kahve", {
    fetchProfile: async (slug) => {
      active = false;
      return { success: true, profile: { id: "business-1", slug }, redirectTarget: null };
    },
    isCurrent: () => active,
    logScan: () => { logCount += 1; },
    replace: () => { replaceCount += 1; }
  });

  assert.deepEqual(result, { status: "stale" });
  assert.equal(logCount, 0);
  assert.equal(replaceCount, 0);
});
