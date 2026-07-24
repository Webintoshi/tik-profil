import assert from "node:assert/strict";
import test from "node:test";

import {
    parseOperatorArgs,
    redactSensitiveText,
    runDryRun,
} from "./discover-ordu-petshops.mjs";

test("operator command defaults to dry-run and accepts a district subset", () => {
    const parsed = parseOperatorArgs([
        "--base-url", "https://admin.example.test",
        "--cookie-env", "IMPORT_ADMIN_COOKIE",
        "--idempotency-key", "8ea30803-a95e-45c5-a789-c165d40e6db5",
        "--district", "Altınordu",
        "--district", "Fatsa",
    ], { IMPORT_ADMIN_COOKIE: "tik_session=secret" });

    assert.equal(parsed.dryRun, true);
    assert.deepEqual(parsed.districts, ["Altınordu", "Fatsa"]);
    assert.equal(parsed.baseUrl, "https://admin.example.test");
    assert.equal(parsed.cookie, "tik_session=secret");
    assert.equal(parsed.idempotencyKey, "8ea30803-a95e-45c5-a789-c165d40e6db5");
});

test("operator command rejects publishing and implicit operator authentication", () => {
    assert.throws(
        () => parseOperatorArgs(["--publish", "--base-url", "https://admin.example.test"], {}),
        /Publishing is not supported/,
    );
    assert.throws(
        () => parseOperatorArgs(["--base-url", "https://admin.example.test"], {}),
        /--cookie-env is required/,
    );
    assert.throws(
        () => parseOperatorArgs([
            "--base-url", "https://admin.example.test",
            "--cookie-env", "IMPORT_ADMIN_COOKIE",
            "--idempotency-key", "8ea30803-a95e-45c5-a789-c165d40e6db5",
        ], {}),
        /does not contain an operator session/,
    );
});

test("operator command rejects unknown districts and non-http base URLs", () => {
    const auth = { IMPORT_ADMIN_COOKIE: "tik_session=secret" };
    assert.throws(
        () => parseOperatorArgs([
            "--base-url", "https://admin.example.test",
            "--cookie-env", "IMPORT_ADMIN_COOKIE",
            "--idempotency-key", "8ea30803-a95e-45c5-a789-c165d40e6db5",
            "--district", "Merkez",
        ], auth),
        /Unknown Ordu district/,
    );
    assert.throws(
        () => parseOperatorArgs([
            "--base-url", "http://remote.example.test",
            "--cookie-env", "IMPORT_ADMIN_COOKIE",
            "--idempotency-key", "8ea30803-a95e-45c5-a789-c165d40e6db5",
        ], auth),
        /https/,
    );
    assert.throws(
        () => parseOperatorArgs([
            "--base-url", "https://user:pass@admin.example.test",
            "--cookie-env", "IMPORT_ADMIN_COOKIE",
            "--idempotency-key", "8ea30803-a95e-45c5-a789-c165d40e6db5",
        ], auth),
        /must not contain credentials/,
    );
    assert.doesNotThrow(() => parseOperatorArgs([
        "--base-url", "http://127.0.0.1:3000",
        "--cookie-env", "IMPORT_ADMIN_COOKIE",
        "--idempotency-key", "8ea30803-a95e-45c5-a789-c165d40e6db5",
    ], auth));
});

test("operator command rejects ambiguous cookies and missing or malformed replay keys", () => {
    const base = ["--base-url", "https://admin.example.test", "--cookie-env", "IMPORT_ADMIN_COOKIE"];
    assert.throws(
        () => parseOperatorArgs([...base, "--idempotency-key", "8ea30803-a95e-45c5-a789-c165d40e6db5"], {
            IMPORT_ADMIN_COOKIE: "tik_session=one; another=two",
        }),
        /exactly one session cookie/,
    );
    assert.throws(
        () => parseOperatorArgs(base, { IMPORT_ADMIN_COOKIE: "tik_session=one" }),
        /--idempotency-key is required/,
    );
    assert.throws(
        () => parseOperatorArgs([...base, "--idempotency-key", "not-a-uuid"], { IMPORT_ADMIN_COOKIE: "tik_session=one" }),
        /must be a UUID/,
    );
});

test("dry-run posts once, polls to completion, and prints counts only", async () => {
    const requests = [];
    const responses = [
        new Response(JSON.stringify({ batchId: "batch-1", status: "running" }), { status: 202 }),
        new Response(JSON.stringify({
            id: "batch-1",
            status: "running",
            importedCount: 0,
            matchedCount: 0,
            skippedCount: 0,
            failedCount: 0,
            providerSecret: "must-not-print",
        })),
        new Response(JSON.stringify({
            id: "batch-1",
            status: "completed",
            importedCount: 7,
            matchedCount: 2,
            skippedCount: 1,
            failedCount: 0,
            candidateName: "Private Petshop",
        })),
    ];
    const output = [];

    const result = await runDryRun({
        baseUrl: "https://admin.example.test",
        cookie: "tik_session=secret",
        districts: ["Altınordu"],
        dryRun: true,
        idempotencyKey: "8ea30803-a95e-45c5-a789-c165d40e6db5",
        pollIntervalMs: 0,
        maxPolls: 3,
    }, {
        fetch: async (url, init) => {
            requests.push({ url: String(url), init });
            return responses.shift();
        },
        log: (line) => output.push(line),
        sleep: async () => {},
    });

    assert.equal(result.status, "completed");
    assert.equal(requests.length, 3);
    assert.equal(requests[0].init.headers.Cookie, "tik_session=secret");
    assert.deepEqual(JSON.parse(requests[0].init.body), {
        city: "Ordu",
        districts: ["Altınordu"],
        idempotencyKey: "8ea30803-a95e-45c5-a789-c165d40e6db5",
    });
    assert.deepEqual(output, [
        "Durum: completed",
        "Yeni aday: 7",
        "Eşleşen: 2",
        "Atlanan: 1",
        "Başarısız: 0",
    ]);
    const rendered = output.join("\n");
    assert.doesNotMatch(rendered, /secret|Private Petshop|providerSecret|batch-1/);
});

test("redaction covers provider keys, Logto secrets, passwords, and recovery tokens", () => {
    const source = [
        "GOOGLE_MAPS_API_KEY=places-key",
        "LOGTO_MANAGEMENT_APP_SECRET=logto-secret",
        "password=hunter2",
        "recoveryToken=recovery-value",
        "Cookie: tik_session=session-value",
    ].join("\n");
    const redacted = redactSensitiveText(source);

    for (const secret of ["places-key", "logto-secret", "hunter2", "recovery-value", "session-value"]) {
        assert.doesNotMatch(redacted, new RegExp(secret));
    }
});

test("a terminal start replay still loads authoritative aggregate counts", async () => {
    const output = [];
    const responses = [
        new Response(JSON.stringify({ batchId: "batch-replay", status: "completed" }), { status: 202 }),
        new Response(JSON.stringify({
            id: "batch-replay",
            status: "completed",
            importedCount: 4,
            matchedCount: 1,
            skippedCount: 2,
            failedCount: 0,
        })),
    ];

    await runDryRun({
        baseUrl: "https://admin.example.test",
        cookie: "tik_session=secret",
        districts: ["Fatsa"],
        dryRun: true,
        idempotencyKey: "f32c788c-d7f7-4656-b799-0311cd8612b0",
        pollIntervalMs: 0,
        maxPolls: 1,
    }, {
        fetch: async () => responses.shift(),
        log: (line) => output.push(line),
        sleep: async () => {},
    });

    assert.deepEqual(output, [
        "Durum: completed",
        "Yeni aday: 4",
        "Eşleşen: 1",
        "Atlanan: 2",
        "Başarısız: 0",
    ]);
});

test("failed terminal batches print aggregate counts and fail the process contract", async () => {
    const output = [];
    const responses = [
        new Response(JSON.stringify({ batchId: "batch-failed", status: "running" }), { status: 202 }),
        new Response(JSON.stringify({
            id: "batch-failed",
            status: "failed",
            importedCount: 1,
            matchedCount: 0,
            skippedCount: 0,
            failedCount: 1,
        })),
    ];

    await assert.rejects(runDryRun({
        baseUrl: "https://admin.example.test",
        cookie: "tik_session=secret",
        districts: ["Fatsa"],
        dryRun: true,
        idempotencyKey: "c090309c-6d9a-421d-b9d8-e107b9fe222d",
        pollIntervalMs: 0,
        maxPolls: 1,
    }, {
        fetch: async () => responses.shift(),
        log: (line) => output.push(line),
        sleep: async () => {},
    }), /failed batch/);
    assert.equal(output.at(-1), "Başarısız: 1");
});
