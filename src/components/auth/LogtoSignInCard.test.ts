import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Logto authorization starts with a document navigation instead of the Next router", async () => {
    const source = await readFile(new URL("./LogtoSignInCard.tsx", import.meta.url), "utf8");

    assert.doesNotMatch(source, /import Link from ["']next\/link["']/);
    assert.match(source, /<a\s+href=\{signInHref\}/);
});

test("business sign-in goes directly to the business profile editor", async () => {
    const [loginPage, service] = await Promise.all([
        readFile(new URL("../../app/(auth)/giris-yap/page.tsx", import.meta.url), "utf8"),
        readFile(new URL("../../server/auth/logto/service.ts", import.meta.url), "utf8"),
    ]);

    assert.match(loginPage, /defaultCallbackPath="\/panel\/profile"/);
    assert.match(service, /return "\/panel\/profile";/);
});
