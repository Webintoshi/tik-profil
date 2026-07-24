import assert from "node:assert/strict";
import test from "node:test";

interface FactDraft {
    fieldKey: string;
    value: string;
    sourceType: string;
}

interface StateHelpers {
    buildCandidateApproval(drafts: readonly FactDraft[], districts: readonly string[]): { complete: boolean; reason: string };
    createBatchPoller<T extends { status: string }>(options: {
        loadBatch: () => Promise<T>;
        loadCandidates: () => Promise<void>;
        onBatch: (batch: T) => void;
        onError: (error: unknown) => void;
        schedule: (callback: () => void) => () => void;
    }): { pollNow: () => Promise<void>; stop: () => void };
    createCredentialDeliveryAction<T extends { deliveryGeneration: string }>(options: {
        request: (credential: T) => Promise<number>;
        onRemove: (generation: string, notice: string) => void;
    }): (credential: T) => Promise<"delivered" | "stale">;
    removeCredentialGeneration<T extends { deliveryGeneration: string }>(credentials: readonly T[], generation: string): T[];
    selectPostRemovalFocusTarget(previous: readonly string[], current: readonly string[], removed: string): string | null;
    STALE_CREDENTIAL_NOTICE: string;
}

async function loadHelpers(): Promise<StateHelpers> {
    const moduleUrl = new URL("./business-import-ui-state.ts", import.meta.url).href;
    try {
        return await import(moduleUrl) as StateHelpers;
    } catch {
        assert.fail("Behavioral state helpers are not implemented");
    }
}

const requiredFacts: FactDraft[] = [
    { fieldKey: "name", value: "Pati Dünyası", sourceType: "admin_verified" },
    { fieldKey: "city", value: " Ordu ", sourceType: "public_registry" },
    { fieldKey: "district", value: "Altınordu", sourceType: "business_submitted" },
    { fieldKey: "category", value: "Petshop", sourceType: "business_website" },
];

test("batch polling deduplicates in-flight calls and terminates after a terminal status", async () => {
    const { createBatchPoller } = await loadHelpers();
    let resolveFirst!: (value: { status: string }) => void;
    const first = new Promise<{ status: string }>((resolve) => { resolveFirst = resolve; });
    const batches = [first, Promise.resolve({ status: "completed" })];
    const scheduled: Array<() => void> = [];
    let loadCalls = 0;
    let candidateLoads = 0;

    const poller = createBatchPoller({
        loadBatch: async () => batches[loadCalls++]!,
        loadCandidates: async () => { candidateLoads += 1; },
        onBatch: () => undefined,
        onError: (error) => { throw error; },
        schedule: (callback) => { scheduled.push(callback); return () => undefined; },
    });

    const firstPoll = poller.pollNow();
    const duplicatePoll = poller.pollNow();
    assert.equal(loadCalls, 1);
    resolveFirst({ status: "running" });
    await Promise.all([firstPoll, duplicatePoll]);
    assert.equal(scheduled.length, 1);

    scheduled[0]?.();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(loadCalls, 2);
    assert.equal(candidateLoads, 1);
    await poller.pollNow();
    assert.equal(loadCalls, 2);
});

test("candidate approval accepts a sourced valid phone as the only contact", async () => {
    const { buildCandidateApproval } = await loadHelpers();
    const result = buildCandidateApproval([
        ...requiredFacts,
        { fieldKey: "phone", value: " 0 (452) 555 12 34 ", sourceType: "business_submitted" },
    ], ["Altınordu"]);

    assert.deepEqual(result, { complete: true, reason: "" });
});

test("candidate approval accepts a sourced HTTPS website as the only contact", async () => {
    const { buildCandidateApproval } = await loadHelpers();
    const result = buildCandidateApproval([
        ...requiredFacts,
        { fieldKey: "website", value: " https://patidunyasi.example/iletisim ", sourceType: "business_website" },
    ], ["Altınordu"]);

    assert.deepEqual(result, { complete: true, reason: "" });
});

test("candidate approval rejects blank values and unpermitted provenance", async () => {
    const { buildCandidateApproval } = await loadHelpers();
    const result = buildCandidateApproval([
        ...requiredFacts,
        { fieldKey: "phone", value: "   ", sourceType: "admin_verified" },
        { fieldKey: "website", value: "https://pati.example", sourceType: "google_places" },
    ], ["Altınordu"]);

    assert.equal(result.complete, false);
    assert.match(result.reason, /kaynaklı geçerli adres, telefon veya web sitesi/);
});

test("credential delivery has no automatic acknowledgement and scrubs stale 409 generations", async () => {
    const {
        STALE_CREDENTIAL_NOTICE,
        createCredentialDeliveryAction,
        removeCredentialGeneration,
    } = await loadHelpers();
    const secret = {
        businessId: "business-1",
        businessName: "Pati Dünyası",
        loginEmail: "pati@tikprofil.com",
        initialPassword: "Secret-123456789",
        deliveryGeneration: "generation-1",
    };
    let credentials = [secret];
    let requests = 0;
    let notice = "";
    const deliver = createCredentialDeliveryAction({
        request: async () => { requests += 1; return 409; },
        onRemove: (generation, nextNotice) => {
            credentials = removeCredentialGeneration(credentials, generation);
            notice = nextNotice;
        },
    });

    assert.equal(requests, 0);
    assert.equal(credentials[0]?.initialPassword, "Secret-123456789");
    const outcome = await deliver(secret);

    assert.equal(outcome, "stale");
    assert.equal(requests, 1);
    assert.deepEqual(credentials, []);
    assert.equal(notice, STALE_CREDENTIAL_NOTICE);
    assert.doesNotMatch(notice, /pati|secret|business-1/i);
});

test("post-removal focus selects the next surviving action or the close button", async () => {
    const { selectPostRemovalFocusTarget } = await loadHelpers();

    assert.equal(selectPostRemovalFocusTarget(["a", "b", "c"], ["a", "c"], "b"), "c");
    assert.equal(selectPostRemovalFocusTarget(["a", "b"], ["a"], "b"), "a");
    assert.equal(selectPostRemovalFocusTarget(["a"], [], "a"), null);
});
