import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Logto authorization starts with a document navigation instead of the Next router", async () => {
    const source = await readFile(new URL("./LogtoSignInCard.tsx", import.meta.url), "utf8");

    assert.doesNotMatch(source, /import Link from ["']next\/link["']/);
    assert.match(source, /<a\s+href=\{signInHref\}/);
});

test("business sign-in goes directly to the business profile editor", async () => {
    const [businessEntry, service] = await Promise.all([
        readFile(new URL("../../server/auth/logto/business-entry.ts", import.meta.url), "utf8"),
        readFile(new URL("../../server/auth/logto/service.ts", import.meta.url), "utf8"),
    ]);

    assert.match(businessEntry, /normalizeLogtoRedirectPath\(input\.callbackUrl, "\/panel\/profile"\)/);
    assert.match(service, /return "\/panel\/profile";/);
});

test("business recovery uses Tik Profil copy and amber styling", async () => {
    const source = await readFile(new URL("./BusinessLogtoRecovery.tsx", import.meta.url), "utf8");

    assert.match(source, /Tekrar dene/);
    assert.match(source, /#FFB347/i);
    assert.match(source, /İşletme girişine dön/);
    assert.doesNotMatch(source, /PostgreSQL|canary|Logto ile devam et/i);
});

test("business login page renders recovery only for an error or logout result", async () => {
    const source = await readFile(new URL("../../app/(auth)/giris-yap/page.tsx", import.meta.url), "utf8");

    assert.match(source, /BusinessLogtoRecovery/);
    assert.match(source, /entry\.kind === "redirect"/);
    assert.match(source, /authError=\{entry\.authError\}/);
    assert.match(source, /loggedOut=\{entry\.loggedOut\}/);
});
