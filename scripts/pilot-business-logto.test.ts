import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
    parsePilotCommand,
    publicProvisionResult,
    writeCredentialOnce,
} from "./pilot-business-logto-cli.ts";

const actorId = "00000000-0000-4000-8000-000000000001";

test("pilot CLI accepts only one exact mode and requires a single slug", () => {
    assert.deepEqual(parsePilotCommand(["--preflight", "--slug", "petshop-1"]), {
        mode: "preflight",
        slug: "petshop-1",
    });
    assert.throws(() => parsePilotCommand(["--preflight", "--rollback", "--slug", "petshop-1"]), /exactly_one_mode_required/);
    assert.throws(() => parsePilotCommand(["--preflight"]), /slug_required/);
});

test("provision requires an actor and a one-time credential destination", () => {
    assert.deepEqual(parsePilotCommand([
        "--provision", "--slug", "petshop-1", "--actor-id", actorId, "--credential-file", "pilot.json",
    ]), {
        actorId,
        credentialFile: "pilot.json",
        mode: "provision",
        slug: "petshop-1",
    });
    assert.throws(() => parsePilotCommand(["--provision", "--slug", "petshop-1"]), /valid_actor_id_required/);
});

test("acknowledge and reset modes require their exact delivery inputs", () => {
    assert.deepEqual(parsePilotCommand([
        "--acknowledge", "--slug", "petshop-1", "--delivery-generation", actorId,
    ]), {
        deliveryGeneration: actorId,
        mode: "acknowledge",
        slug: "petshop-1",
    });
    assert.deepEqual(parsePilotCommand([
        "--reset", "--slug", "petshop-1", "--credential-file", "reset.json",
    ]), {
        credentialFile: "reset.json",
        mode: "reset",
        slug: "petshop-1",
    });
    assert.throws(() => parsePilotCommand(["--acknowledge", "--slug", "petshop-1"]), /valid_delivery_generation_required/);
    assert.throws(() => parsePilotCommand(["--reset", "--slug", "petshop-1"]), /credential_file_required/);
});

test("credentials are written once and never included in public command output", async () => {
    const directory = await mkdtemp(join(tmpdir(), "tikprofil-pilot-"));
    const path = join(directory, "credential.json");
    const credentials = {
        businessId: "business-1",
        businessName: "Petshop 1",
        deliveryGeneration: "delivery-1",
        initialPassword: "Secret-123456789",
        loginEmail: "petshop-1@tikprofil.com",
    };
    try {
        await writeCredentialOnce(path, credentials);
        assert.deepEqual(JSON.parse(await readFile(path, "utf8")), credentials);
        await assert.rejects(writeCredentialOnce(path, credentials), (error: NodeJS.ErrnoException) => error.code === "EEXIST");

        const output = publicProvisionResult({
            business: { id: "business-1", name: "Petshop 1", status: "active" },
            credentials,
            status: "provisioned",
        });
        assert.equal(JSON.stringify(output).includes(credentials.initialPassword), false);
        assert.equal(output.credentialWritten, true);
    } finally {
        await rm(directory, { force: true, recursive: true });
    }
});
