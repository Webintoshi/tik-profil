import assert from "node:assert/strict";
import test from "node:test";

import {
    credentialFilename,
    ELIGIBLE_BUSINESSES_SQL,
    parseBulkProvisionCommand,
    retryCredentialAcknowledgement,
} from "./provision-ordu-food-accounts.ts";

const ACTOR_ID = "033c5aa5-d370-47d2-bf33-9c010e1c48d6";

test("bulk account provisioning is dry-run by default", () => {
    assert.deepEqual(parseBulkProvisionCommand([]), {
        actorId: null,
        apply: false,
        concurrency: 2,
        credentialDir: null,
        industryId: "fastfood",
        categoryLabel: "Fast Food",
        limit: null,
    });
});

test("apply requires an actor, credential directory, and bounded concurrency", () => {
    assert.deepEqual(parseBulkProvisionCommand([
        "--apply",
        "--actor-id", ACTOR_ID,
        "--credential-dir", "/credentials",
        "--concurrency", "3",
        "--industry-id", "oto_galeri",
        "--category-label", "Oto Galeri",
        "--limit", "20",
    ]), {
        actorId: ACTOR_ID,
        apply: true,
        concurrency: 3,
        credentialDir: "/credentials",
        industryId: "oto_galeri",
        categoryLabel: "Oto Galeri",
        limit: 20,
    });
    assert.throws(() => parseBulkProvisionCommand(["--apply"]), /actor_id_required/);
    assert.throws(() => parseBulkProvisionCommand([
        "--apply", "--actor-id", ACTOR_ID, "--credential-dir", "/credentials", "--concurrency", "6",
    ]), /concurrency_out_of_range/);
    assert.throws(() => parseBulkProvisionCommand(["--limit"]), /option_value_required:--limit/);
});

test("credential filenames accept only normalized business slugs", () => {
    assert.equal(credentialFilename("kahraman-tost"), "kahraman-tost.json");
    assert.throws(() => credentialFilename("../secret"), /unsafe_business_slug/);
    assert.throws(() => credentialFilename("Kahraman Tost"), /unsafe_business_slug/);
});

test("eligible account query excludes existing issuances through the production table", () => {
    assert.match(ELIGIBLE_BUSINESSES_SQL, /NOT EXISTS[\s\S]*business_account_issuances/i);
    assert.match(ELIGIBLE_BUSINESSES_SQL, /industry_id[^\n]*=\s*\$2/i);
    assert.doesNotMatch(ELIGIBLE_BUSINESSES_SQL, /business_account_bindings/i);
});

test("credential acknowledgement retries transient failures without logging credentials", async () => {
    let attempts = 0;
    const result = await retryCredentialAcknowledgement(async () => {
        attempts += 1;
        if (attempts < 3) throw new Error("temporary_failure");
        return "delivered";
    }, async () => undefined);

    assert.equal(result, "delivered");
    assert.equal(attempts, 3);
});
