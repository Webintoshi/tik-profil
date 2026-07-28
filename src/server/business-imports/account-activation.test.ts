import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
    AccountActivationError,
    buildActivationVerificationResultUrl,
    createAccountActivationService,
    createPostgresAccountActivationRepository,
    getPanelActivationRedirect,
    hashActivationToken,
    isSameOriginActivationRequest,
    mapAccountActivationGateState,
    mapAccountActivationState,
    validateActivationPassword,
    type AccountActivationIdentity,
    type AccountActivationRepository,
    type ActivationChallengeInput,
    type ActivationIssuance,
    type ActivationState,
} from "./account-activation.ts";
import type { LogtoUser } from "../auth/logto/management-client.ts";

const identity: AccountActivationIdentity = {
    appUserId: "app-user-1",
    businessId: "business-1",
    authProvider: "logto",
    logtoSub: "logto-user-1",
};

const issuance: ActivationIssuance = {
    accountIssuanceId: "issuance-1",
    appUserId: identity.appUserId,
    businessId: identity.businessId,
    businessName: "Ordu Pati Petshop",
    candidateId: "candidate-1",
    loginAlias: "ordu-pati@tikprofil.com",
    providerUserId: identity.logtoSub,
    state: "issued",
};

class FakeActivationRepository implements AccountActivationRepository {
    readonly challenges: Array<ActivationChallengeInput & { invalidated: boolean; used: boolean }> = [];
    currentIssuance: ActivationIssuance = { ...issuance };
    lastChallengeCreatedAt: Date | null = null;
    now = new Date("2026-07-24T09:00:00.000Z");

    async withProvisioningLock<T>(_businessId: string, operation: () => Promise<T>): Promise<T> {
        return operation();
    }

    async getState(input: AccountActivationIdentity): Promise<ActivationState | null> {
        return this.matches(input) ? this.currentIssuance.state : null;
    }

    async preparePasswordChange(input: AccountActivationIdentity): Promise<ActivationIssuance> {
        if (!this.matches(input)) throw new AccountActivationError("activation_unavailable");
        if (this.lastChallengeCreatedAt && this.now.getTime() - this.lastChallengeCreatedAt.getTime() < 60_000) {
            throw new AccountActivationError("activation_retry_later");
        }
        if (this.currentIssuance.state !== "issued") {
            throw new AccountActivationError("activation_unavailable");
        }
        return { ...this.currentIssuance };
    }

    async createRecoveryChallenge(input: ActivationChallengeInput): Promise<void> {
        for (const challenge of this.challenges) {
            if (challenge.accountIssuanceId === input.accountIssuanceId && !challenge.used) {
                challenge.invalidated = true;
                challenge.used = true;
            }
        }
        this.challenges.push({ ...input, invalidated: false, used: false });
        this.lastChallengeCreatedAt = new Date(input.createdAt);
    }

    async invalidateRecoveryChallenge(tokenHash: string): Promise<void> {
        const challenge = this.challenges.find((item) => item.tokenHash === tokenHash);
        if (challenge) {
            challenge.invalidated = true;
            challenge.used = true;
        }
    }

    async markPasswordChanged(input: AccountActivationIdentity, tokenHash: string): Promise<void> {
        if (!this.matches(input)) throw new AccountActivationError("activation_unavailable");
        const challenge = this.challenges.find((item) => item.tokenHash === tokenHash);
        if (!challenge || challenge.invalidated || challenge.used || challenge.expiresAt <= this.now) {
            throw new AccountActivationError("activation_retry_later");
        }
        this.currentIssuance.state = "password_changed";
    }

    async consumeRecoveryChallenge(tokenHash: string): Promise<boolean> {
        const challenge = this.challenges.find((item) => item.tokenHash === tokenHash);
        if (
            !challenge
            || challenge.invalidated
            || challenge.used
            || challenge.expiresAt <= this.now
            || this.currentIssuance.state !== "password_changed"
        ) {
            return false;
        }
        challenge.used = true;
        this.currentIssuance.state = "active";
        return true;
    }

    private matches(input: AccountActivationIdentity): boolean {
        return input.authProvider === "logto"
            && input.appUserId === this.currentIssuance.appUserId
            && input.businessId === this.currentIssuance.businessId
            && input.logtoSub === this.currentIssuance.providerUserId;
    }
}

function createFixture(options: {
    sendSucceeds?: boolean;
    user?: LogtoUser | null;
} = {}) {
    const repository = new FakeActivationRepository();
    const sent: Array<{ to: string; verificationUrl: string }> = [];
    const passwordMutations: Array<{ password: string; userId: string }> = [];
    let tokenByte = 7;
    const user = options.user === undefined ? {
        customData: { tikProfilImportCandidateId: issuance.candidateId },
        id: issuance.providerUserId,
        isSuspended: false,
        name: issuance.businessName,
        primaryEmail: issuance.loginAlias,
    } satisfies LogtoUser : options.user;
    const service = createAccountActivationService({
        appUrl: "https://app.tikprofil.test/base/path",
        emailSender: {
            async sendRecoveryVerification(input) {
                sent.push({ to: input.to, verificationUrl: input.verificationUrl });
                return options.sendSucceeds !== false;
            },
        },
        generateTokenBytes: () => Buffer.alloc(32, tokenByte++),
        logto: {
            async getUser() {
                return user;
            },
            async setPassword(userId, password) {
                passwordMutations.push({ userId, password });
            },
        },
        now: () => repository.now,
        repository,
    });
    return { passwordMutations, repository, sent, service, user };
}

test("maps only activation-bearing issuance statuses", () => {
    for (const status of ["issued", "delivered", "failed"] as const) {
        assert.equal(mapAccountActivationState(status), "issued");
    }
    assert.equal(mapAccountActivationState("password_changed"), "password_changed");
    assert.equal(mapAccountActivationState("active"), "active");
    assert.equal(mapAccountActivationState("reserved"), null);
    assert.equal(mapAccountActivationGateState("active", false), "issued");
    assert.equal(mapAccountActivationGateState("active", true), "active");
    assert.equal(mapAccountActivationGateState("reserved", true), "issued");
});

test("password policy enforces length, character classes, controls, common values, and alias resistance", () => {
    const invalid = [
        "Short1!",
        `${"A".repeat(126)}a1!`,
        "alllowercase1!",
        "ALLUPPERCASE1!",
        "NoDigitsHere!",
        "NoSymbolHere1",
        "Valid But Space1!",
        "Password123!",
        "OrduPati2026!",
    ];
    for (const password of invalid) {
        assert.throws(
            () => validateActivationPassword(password, [issuance.loginAlias, issuance.businessName]),
            (error: unknown) => error instanceof AccountActivationError && error.code === "password_invalid",
            password,
        );
    }
    assert.doesNotThrow(() => validateActivationPassword("Kutup!Feneri2026", [issuance.loginAlias, issuance.businessName]));
});

test("panel gate redirects only imported Logto owners and avoids activation loops", () => {
    const owner = { authProvider: "logto" as const, appUserId: identity.appUserId, businessId: identity.businessId, isStaff: false, logtoSub: identity.logtoSub, role: "owner" as const };
    assert.equal(getPanelActivationRedirect("/panel/profile", owner, "issued"), "/hesap-aktivasyonu");
    assert.equal(getPanelActivationRedirect("/hesap-aktivasyonu", owner, "issued"), null);
    assert.equal(getPanelActivationRedirect("/panel/orders", owner, "password_changed"), "/hesap-aktivasyonu");
    assert.equal(getPanelActivationRedirect("/panel/profile", owner, "active"), null);
    assert.equal(getPanelActivationRedirect("/hesap-aktivasyonu", owner, "active"), "/panel");
    assert.equal(getPanelActivationRedirect("/panel/profile", { ...owner, isStaff: true }, "issued"), null);
    assert.equal(getPanelActivationRedirect("/panel/profile", { ...owner, authProvider: "legacy" }, "issued"), null);
    assert.equal(getPanelActivationRedirect("/panel/profile", { ...owner, appUserId: undefined, logtoSub: undefined }, "issued"), null);
    assert.equal(getPanelActivationRedirect("/panel/profile", owner, null), null);
});

test("repository distinguishes unrelated owners while failing closed on issuance identity conflicts", async () => {
    const states = [
        [],
        [{ issuance_status: "active", exact_binding: false }],
        [{ issuance_status: "active", exact_binding: true }],
        [
            { issuance_status: "active", exact_binding: true },
            { issuance_status: "active", exact_binding: false },
        ],
    ];
    const repository = createPostgresAccountActivationRepository({
        execute: async () => {
            const rows = states.shift() ?? [];
            return { rowCount: rows.length, rows };
        },
    });

    assert.equal(await repository.getState(identity), null);
    assert.equal(await repository.getState(identity), "issued");
    assert.equal(await repository.getState(identity), "active");
    assert.equal(await repository.getState(identity), "issued");
});

test("cross-business or cross-session identity fails before any password mutation", async () => {
    const fixture = createFixture();
    await assert.rejects(
        fixture.service.changePasswordAndSendRecoveryVerification({
            identity: { ...identity, businessId: "business-2" },
            newPassword: "Kutup!Feneri2026",
            recoveryEmail: "owner@example.com",
        }),
        (error: unknown) => error instanceof AccountActivationError && error.code === "activation_unavailable",
    );
    assert.deepEqual(fixture.passwordMutations, []);
});

test("Logto marker, id, and synthetic alias conflicts fail before password mutation", async () => {
    const conflicts: LogtoUser[] = [
        { customData: { tikProfilImportCandidateId: "other" }, id: issuance.providerUserId, isSuspended: false, name: null, primaryEmail: issuance.loginAlias },
        { customData: { tikProfilImportCandidateId: issuance.candidateId }, id: "other-user", isSuspended: false, name: null, primaryEmail: issuance.loginAlias },
        { customData: { tikProfilImportCandidateId: issuance.candidateId }, id: issuance.providerUserId, isSuspended: false, name: null, primaryEmail: "other@tikprofil.com" },
    ];
    for (const user of conflicts) {
        const fixture = createFixture({ user });
        await assert.rejects(
            fixture.service.changePasswordAndSendRecoveryVerification({
                identity,
                newPassword: "Kutup!Feneri2026",
                recoveryEmail: "owner@example.com",
            }),
            (error: unknown) => error instanceof AccountActivationError && error.code === "activation_unavailable",
        );
        assert.deepEqual(fixture.passwordMutations, []);
    }
});

test("activation keeps the synthetic alias unchanged and stores only a SHA-256 token hash", async () => {
    const fixture = createFixture();
    const consoleValues: string[] = [];
    const originalError = console.error;
    const originalLog = console.log;
    console.error = (...values: unknown[]) => { consoleValues.push(values.join(" ")); };
    console.log = (...values: unknown[]) => { consoleValues.push(values.join(" ")); };
    try {
        await fixture.service.changePasswordAndSendRecoveryVerification({
            identity,
            newPassword: "Kutup!Feneri2026",
            recoveryEmail: " Owner+Recovery@Example.COM ",
        });
    } finally {
        console.error = originalError;
        console.log = originalLog;
    }

    assert.deepEqual(fixture.passwordMutations, [{ userId: issuance.providerUserId, password: "Kutup!Feneri2026" }]);
    assert.equal(fixture.user?.primaryEmail, issuance.loginAlias);
    assert.equal(fixture.sent[0]?.to, "owner+recovery@example.com");
    const rawToken = new URL(fixture.sent[0]!.verificationUrl).searchParams.get("token");
    assert.ok(rawToken);
    assert.equal(Buffer.from(rawToken, "base64url").byteLength, 32);
    assert.equal(fixture.repository.challenges[0]?.tokenHash, createHash("sha256").update(rawToken).digest("hex"));
    assert.equal(JSON.stringify(fixture.repository.challenges).includes(rawToken), false);
    assert.equal(consoleValues.join(" ").includes(rawToken), false);
    assert.equal(fixture.repository.currentIssuance.state, "password_changed");
});

test("a new challenge invalidates the previous unused token", async () => {
    const fixture = createFixture();
    await fixture.service.changePasswordAndSendRecoveryVerification({ identity, newPassword: "Kutup!Feneri2026", recoveryEmail: "one@example.com" });
    const first = fixture.repository.challenges[0]!;
    fixture.repository.currentIssuance.state = "issued";
    fixture.repository.lastChallengeCreatedAt = null;
    await fixture.service.changePasswordAndSendRecoveryVerification({ identity, newPassword: "Yeni!Parola2027", recoveryEmail: "two@example.com" });
    assert.equal(first.invalidated, true);
    assert.equal(first.used, true);
    assert.equal(fixture.repository.challenges.at(-1)?.invalidated, false);
});

test("email failure invalidates its token and leaves issuance in issued state", async () => {
    const fixture = createFixture({ sendSucceeds: false });
    await assert.rejects(
        fixture.service.changePasswordAndSendRecoveryVerification({ identity, newPassword: "Kutup!Feneri2026", recoveryEmail: "owner@example.com" }),
        (error: unknown) => error instanceof AccountActivationError && error.code === "activation_retry_later",
    );
    assert.equal(fixture.repository.challenges[0]?.invalidated, true);
    assert.equal(fixture.repository.currentIssuance.state, "issued");
});

test("database challenge timestamp rate limit blocks repeated requests before password mutation", async () => {
    const fixture = createFixture();
    fixture.repository.lastChallengeCreatedAt = new Date(fixture.repository.now.getTime() - 30_000);
    await assert.rejects(
        fixture.service.changePasswordAndSendRecoveryVerification({ identity, newPassword: "Kutup!Feneri2026", recoveryEmail: "owner@example.com" }),
        (error: unknown) => error instanceof AccountActivationError && error.code === "activation_retry_later",
    );
    assert.deepEqual(fixture.passwordMutations, []);
});

test("verification fails closed for wrong, expired, reused, and concurrent tokens", async () => {
    const fixture = createFixture();
    await fixture.service.changePasswordAndSendRecoveryVerification({ identity, newPassword: "Kutup!Feneri2026", recoveryEmail: "owner@example.com" });
    const rawToken = new URL(fixture.sent[0]!.verificationUrl).searchParams.get("token")!;
    assert.equal(await fixture.service.verifyRecoveryEmail("wrong-token"), false);
    fixture.repository.now = new Date("2026-07-24T09:31:00.000Z");
    assert.equal(await fixture.service.verifyRecoveryEmail(rawToken), false);

    fixture.repository.now = new Date("2026-07-24T09:00:00.000Z");
    const challenge = fixture.repository.challenges[0]!;
    challenge.expiresAt = new Date("2026-07-24T09:30:00.000Z");
    const results = await Promise.all([
        fixture.service.verifyRecoveryEmail(rawToken),
        fixture.service.verifyRecoveryEmail(rawToken),
    ]);
    assert.deepEqual(results.sort(), [false, true]);
    assert.equal(await fixture.service.verifyRecoveryEmail(rawToken), false);
    assert.equal(fixture.repository.currentIssuance.state, "active");
});

test("token hashing and configured result URLs never depend on a request Host header", () => {
    assert.equal(hashActivationToken("secret-token"), createHash("sha256").update("secret-token").digest("hex"));
    const resultUrl = buildActivationVerificationResultUrl("https://app.tikprofil.test/base", "invalid");
    assert.equal(resultUrl, "https://app.tikprofil.test/hesap-aktivasyonu?verification=invalid");
    assert.equal(resultUrl.includes("secret-token"), false);
    assert.equal(isSameOriginActivationRequest(new Headers({ origin: "https://app.tikprofil.test" }), "https://app.tikprofil.test"), true);
    assert.equal(isSameOriginActivationRequest(new Headers({ origin: "https://evil.example" }), "https://app.tikprofil.test"), false);
    assert.equal(isSameOriginActivationRequest(new Headers(), "https://app.tikprofil.test"), false);
});

test("panel session retains authenticated Logto identity while legacy and impersonation remain ungated", async () => {
    const source = await readFile(new URL("../../lib/panel/session.ts", import.meta.url), "utf8");
    assert.match(source, /appUserId\?: string/);
    assert.match(source, /authProvider\?: [^;]*"logto"/);
    assert.match(source, /logtoSub\?: string/);
    assert.match(source, /payload\.appUserId/);
    assert.match(source, /payload\.authProvider/);
    assert.match(source, /payload\.logtoSub/);
});

test("activation is structurally outside the panel layout and cannot self-redirect", async () => {
    const [layout, activationPage, middleware] = await Promise.all([
        readFile(new URL("../../app/panel/layout.tsx", import.meta.url), "utf8"),
        readFile(new URL("../../app/hesap-aktivasyonu/page.tsx", import.meta.url), "utf8"),
        readFile(new URL("../../../middleware.ts", import.meta.url), "utf8"),
    ]);
    assert.doesNotMatch(middleware, /createPanelForwardHeaders/);
    assert.match(middleware, /\/panel\/:path\*/);
    assert.match(layout, /getPanelActivationRedirect/);
    assert.match(layout, /getBusinessAccountActivation/);
    assert.doesNotMatch(layout, /readPanelForwardedPathname|headers\(\)/);
    assert.doesNotMatch(layout, /pathname === [^\n]*hesap-aktivasyonu/);
    assert.match(activationPage, /AccountActivationClient/);
    assert.match(activationPage, /loadPanelSession/);
});

test("activation API derives identity from owner session and applies strict same-origin no-store handling", async () => {
    const source = await readFile(new URL("../../app/api/panel/account-activation/route.ts", import.meta.url), "utf8");
    assert.match(source, /loadPanelSession/);
    assert.match(source, /session\.appUserId/);
    assert.match(source, /session\.businessId/);
    assert.match(source, /session\.logtoSub/);
    assert.match(source, /session\.authProvider !== "logto"/);
    assert.match(source, /session\.role !== "owner"/);
    assert.match(source, /isSameOriginActivationRequest/);
    assert.match(source, /\.strict\(\)/);
    assert.match(source, /cache-control[^\n]*no-store/i);
    assert.doesNotMatch(source, /body\.(?:appUserId|businessId|providerUserId|logtoSub|authProvider)/);
});

test("verification route immediately delegates token hashing then 303 redirects to a token-free configured URL", async () => {
    const source = await readFile(new URL("../../app/api/panel/account-activation/verify/route.ts", import.meta.url), "utf8");
    assert.match(source, /verifyBusinessRecoveryEmail\(rawToken\)/);
    assert.match(source, /buildActivationVerificationResultUrl/);
    assert.match(source, /getAppUrl/);
    assert.match(source, /status:\s*303/);
    assert.match(source, /referrer-policy[^\n]*no-referrer/i);
    assert.match(source, /cache-control[^\n]*no-store/i);
    assert.doesNotMatch(source, /request\.headers\.get\(["']host["']\)/i);
    assert.doesNotMatch(source, /console\.(?:log|error|warn)/);
});

test("compact activation UI has confirmation, accessible visibility toggles, progress, and sent/verification states", async () => {
    const [page, client] = await Promise.all([
        readFile(new URL("../../app/hesap-aktivasyonu/page.tsx", import.meta.url), "utf8"),
        readFile(new URL("../../components/panel/AccountActivationClient.tsx", import.meta.url), "utf8"),
    ]);
    assert.match(page, /Jost/);
    assert.match(client, /type=\{visible \? "text" : "password"\}/);
    assert.match(client, /confirmPassword/);
    assert.match(client, /aria-pressed/);
    assert.match(client, /aria-live/);
    assert.match(client, /password_changed/);
    assert.match(client, /verification/);
    assert.match(client, /LoaderCircle/);
    assert.match(client, /maxLength=\{128\}/);
    assert.doesNotMatch(client, /BusinessSidebar|BottomNav|PanelClientLayout/);
});

test("PostgreSQL activation repository uses exact joins, row locks, DB throttling, and hash-only challenge values", async () => {
    const source = await readFile(new URL("./account-activation.ts", import.meta.url), "utf8");
    assert.match(source, /pg_advisory_lock|withProvisioningLock/);
    assert.match(source, /provider_link\.provider_user_id = issuance\.provider_user_id/);
    assert.match(source, /provider_link\.logto_user_id = issuance\.provider_user_id/);
    assert.match(source, /FOR UPDATE OF issuance, provider_link, membership/);
    assert.match(source, /created_at > now\(\) - interval '60 seconds'/);
    assert.match(source, /FOR UPDATE OF recovery, issuance, provider_link, membership/);
    assert.match(source, /candidate\.candidate_status = 'published'/);
    assert.match(source, /business\.status = 'active'/);
    assert.match(source, /issuance\.app_user_id = \$1::uuid[\s\S]*issuance\.business_id = \$2[\s\S]*issuance\.provider_user_id = \$3/);
    assert.match(source, /issuance\.app_user_id = \$1::uuid OR issuance\.provider_user_id = \$3/);
    assert.match(source, /result\.rows\.length !== 1\) return "issued"/);
    assert.match(source, /verification_token_hash/);
    assert.doesNotMatch(source, /raw_token|plaintext_password|primaryEmail\s*:/);
});
