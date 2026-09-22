import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("health migration creates medical children and classifies the broad health inventory", async () => {
    const sql = await readFile(new URL("./0028_health_category_expansion.sql", import.meta.url), "utf8");

    for (const [slug, label] of [
        ["aile-sagligi-merkezi", "Aile Sağlığı Merkezi"],
        ["estetik-medikal", "Estetik & Medikal"],
        ["fizyoterapist", "Fizyoterapi"],
        ["laboratuvar", "Laboratuvar"],
    ]) {
        assert.match(sql, new RegExp(`'saglik',\\s*'${slug}',\\s*'${label}'`, "i"));
    }

    assert.match(sql, /medikal estetik|plastik cerrahi|sac ekim/i);
    assert.match(sql, /aile sagli(?:gi|k) merkezi|saglik ocagi/i);
    assert.match(sql, /fizyoterap|fizik tedavi/i);
    assert.match(sql, /dis hekimi|agiz ve dis|dental/i);
    assert.match(sql, /psikolog|psikolojik danisman/i);
    assert.match(sql, /UPDATE business_discovery_categories/i);
    assert.match(sql, /review_status/i);
    assert.match(sql, /guzellik-salonu/i, "beauty-only businesses must remain outside medical aesthetics");
    assert.match(sql, /guzellik-kuafor/i, "the live broad beauty bucket must release only high-confidence medical aesthetics");
});
