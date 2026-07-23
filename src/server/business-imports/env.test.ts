import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const envModuleUrl = new URL("./env.ts", import.meta.url);

test("import provider secrets are isolated behind a server-only module without public prefixes", async () => {
    const source = await readFile(envModuleUrl, "utf8");

    assert.match(source, /^import "server-only";/m);
    assert.match(source, /GOOGLE_MAPS_API_KEY/);
    assert.match(source, /LOGTO_MANAGEMENT_APP_ID/);
    assert.match(source, /LOGTO_MANAGEMENT_APP_SECRET/);
    assert.match(source, /BUSINESS_IMPORT_RECOVERY_FROM_EMAIL/);
    assert.doesNotMatch(source, /NEXT_PUBLIC_(?:GOOGLE_MAPS_API_KEY|LOGTO_MANAGEMENT_APP_ID|LOGTO_MANAGEMENT_APP_SECRET|BUSINESS_IMPORT_RECOVERY_FROM_EMAIL)/);
});

test("general environment module does not export import provider secrets", async () => {
    const generalEnvSource = await readFile(new URL("../../lib/env.ts", import.meta.url), "utf8");

    assert.doesNotMatch(generalEnvSource, /getGoogleMapsApiKey/);
    assert.doesNotMatch(generalEnvSource, /getLogtoManagementCredentials/);
    assert.doesNotMatch(generalEnvSource, /getBusinessImportRecoveryFromEmail/);
});
