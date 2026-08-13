import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("native email provider link does not infer one parameter as both uuid and text", async () => {
    const source = await readFile(new URL("./service.ts", import.meta.url), "utf8");
    assert.match(source, /VALUES \(\$1::uuid, 'native_email', \$2, \$3/);
    assert.doesNotMatch(source, /'native_email', \$1::text/);
});
