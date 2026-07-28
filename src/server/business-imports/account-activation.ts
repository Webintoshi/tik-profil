import { createHash, randomBytes } from "node:crypto";

import type { LogtoUser } from "../auth/logto/management-client.ts";

export type ActivationState = "issued" | "password_changed" | "active";
export type AccountIssuanceStatus = "reserved" | "issued" | "delivered" | "password_changed" | "active" | "failed";

export interface AccountActivationIdentity {
    appUserId: string;
    authProvider: "logto";
    businessId: string;
    logtoSub: string;
}

export interface ActivationIssuance {
    accountIssuanceId: string;
    appUserId: string;
    businessId: string;
    businessName: string;
    candidateId: string;
    loginAlias: string;
    providerUserId: string;
    state: ActivationState;
}

export interface ActivationChallengeInput {
    accountIssuanceId: string;
    appUserId: string;
    businessId: string;
    createdAt: Date;
    expiresAt: Date;
    providerUserId: string;
    recoveryEmail: string;
    tokenHash: string;
}

export interface AccountActivationRepository {
    withProvisioningLock<T>(businessId: string, operation: () => Promise<T>): Promise<T>;
    getState(identity: AccountActivationIdentity): Promise<ActivationState | null>;
    preparePasswordChange(identity: AccountActivationIdentity): Promise<ActivationIssuance>;
    createRecoveryChallenge(input: ActivationChallengeInput): Promise<void>;
    invalidateRecoveryChallenge(tokenHash: string): Promise<void>;
    markPasswordChanged(identity: AccountActivationIdentity, tokenHash: string): Promise<void>;
    consumeRecoveryChallenge(tokenHash: string): Promise<boolean>;
}

export interface AccountActivationService {
    getState(identity: AccountActivationIdentity): Promise<ActivationState | null>;
    changePasswordAndSendRecoveryVerification(input: {
        identity: AccountActivationIdentity;
        newPassword: string;
        recoveryEmail: string;
    }): Promise<void>;
    verifyRecoveryEmail(rawToken: string): Promise<boolean>;
}

export interface ActivationEmailSender {
    sendRecoveryVerification(input: {
        businessName: string;
        expiresInMinutes: number;
        to: string;
        verificationUrl: string;
    }): Promise<boolean>;
}

export interface ActivationLogtoClient {
    getUser(userId: string): Promise<LogtoUser | null>;
    setPassword(userId: string, password: string): Promise<void>;
}

export type AccountActivationErrorCode =
    | "activation_not_configured"
    | "activation_retry_later"
    | "activation_unavailable"
    | "password_invalid"
    | "recovery_email_invalid";

export class AccountActivationError extends Error {
    readonly code: AccountActivationErrorCode;

    constructor(code: AccountActivationErrorCode) {
        super(code);
        this.name = "AccountActivationError";
        this.code = code;
    }
}

interface QueryResult<Row extends Record<string, unknown> = Record<string, unknown>> {
    rowCount: number | null;
    rows: Row[];
}

type QueryExecutor = (text: string, values?: readonly unknown[]) => Promise<QueryResult>;
type TransactionRunner = <T>(operation: (execute: QueryExecutor) => Promise<T>) => Promise<T>;
type ProvisioningLockRunner = <T>(businessId: string, operation: () => Promise<T>) => Promise<T>;

const ACTIVATION_PATH = "/hesap-aktivasyonu";
const CHALLENGE_LIFETIME_MS = 30 * 60 * 1000;
const COMMON_PASSWORDS = new Set([
    "123456789012",
    "admin123456!",
    "letmein123!",
    "password123!",
    "qwerty123456!",
    "tikprofil123!",
    "welcome12345!",
]);

function stringValue(value: unknown): string {
    return typeof value === "string" ? value : "";
}

function normalizeForPasswordComparison(value: string): string {
    return value.normalize("NFKD").toLocaleLowerCase("tr-TR").replace(/[^a-z0-9]/g, "");
}

function normalizeAppOrigin(appUrl: string): string {
    try {
        const url = new URL(appUrl.trim());
        if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) {
            throw new Error("invalid app URL");
        }
        return url.origin;
    } catch {
        throw new AccountActivationError("activation_not_configured");
    }
}

function normalizeRecoveryEmail(value: string): string {
    const email = value.trim().toLowerCase();
    const [local = "", domain = "", ...rest] = email.split("@");
    if (
        !email
        || email.length > 254
        || local.length > 64
        || !local
        || !domain
        || rest.length > 0
        || /[\s\p{Cc}\p{Cf}]/u.test(email)
        || local.startsWith(".")
        || local.endsWith(".")
        || local.includes("..")
        || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local)
        || !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(domain)
    ) {
        throw new AccountActivationError("recovery_email_invalid");
    }
    return `${local}@${domain}`;
}

export function mapAccountActivationState(status: string | null | undefined): ActivationState | null {
    if (status === "issued" || status === "delivered" || status === "failed") return "issued";
    if (status === "password_changed" || status === "active") return status;
    return null;
}

export function mapAccountActivationGateState(
    status: string | null | undefined,
    exactBinding: boolean,
): ActivationState | null {
    const state = mapAccountActivationState(status);
    return exactBinding ? (state ?? "issued") : "issued";
}

export function validateActivationPassword(password: string, aliases: readonly string[]): void {
    const length = [...password].length;
    const normalized = normalizeForPasswordComparison(password);
    const aliasesToReject = aliases
        .flatMap((value) => [value, value.split("@")[0] ?? "", ...value.split(/[^\p{L}\p{N}]+/u)])
        .map(normalizeForPasswordComparison)
        .filter((value) => value.length >= 4);
    if (
        length < 12
        || length > 128
        || /[\s\p{Cc}\p{Cf}]/u.test(password)
        || !/\p{Ll}/u.test(password)
        || !/\p{Lu}/u.test(password)
        || !/\p{N}/u.test(password)
        || !/[^\p{L}\p{N}]/u.test(password)
        || COMMON_PASSWORDS.has(password.toLowerCase())
        || aliasesToReject.some((alias) => normalized.includes(alias))
    ) {
        throw new AccountActivationError("password_invalid");
    }
}

export function hashActivationToken(rawToken: string): string {
    return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function buildActivationVerificationResultUrl(
    appUrl: string,
    result: "success" | "invalid",
): string {
    const url = new URL(ACTIVATION_PATH, normalizeAppOrigin(appUrl));
    url.searchParams.set("verification", result);
    return url.toString();
}

export function isSameOriginActivationRequest(headers: Headers, appUrl: string): boolean {
    const origin = headers.get("origin");
    if (!origin) return false;
    try {
        return new URL(origin).origin === normalizeAppOrigin(appUrl);
    } catch {
        return false;
    }
}

export function getPanelActivationRedirect(
    pathname: string,
    session: {
        appUserId?: string;
        authProvider?: "legacy" | "logto";
        isStaff: boolean;
        logtoSub?: string;
        role: string;
    },
    state: ActivationState | null,
): string | null {
    const importedLogtoOwner = !session.isStaff
        && session.role === "owner"
        && session.authProvider === "logto"
        && Boolean(session.appUserId)
        && Boolean(session.logtoSub)
        && state !== null;
    if (!importedLogtoOwner) return null;
    if (state === "active") return pathname === ACTIVATION_PATH ? "/panel" : null;
    return pathname === ACTIVATION_PATH ? null : ACTIVATION_PATH;
}

export function getAccountActivationIdentity(session: {
    appUserId?: string;
    authProvider?: "legacy" | "logto";
    businessId: string;
    isStaff: boolean;
    logtoSub?: string;
    role: string;
}): AccountActivationIdentity | null {
    if (
        session.isStaff
        || session.role !== "owner"
        || session.authProvider !== "logto"
        || !session.appUserId
        || !session.businessId
        || !session.logtoSub
    ) return null;
    return {
        appUserId: session.appUserId,
        authProvider: "logto",
        businessId: session.businessId,
        logtoSub: session.logtoSub,
    };
}

function isExactImportedLogtoUser(user: LogtoUser | null, account: ActivationIssuance): user is LogtoUser {
    return Boolean(user)
        && user!.id === account.providerUserId
        && user!.primaryEmail === account.loginAlias
        && user!.customData.tikProfilImportCandidateId === account.candidateId;
}

export function createAccountActivationService(dependencies: {
    appUrl: string;
    emailSender: ActivationEmailSender;
    generateTokenBytes?: () => Uint8Array;
    logto: ActivationLogtoClient;
    now?: () => Date;
    repository: AccountActivationRepository;
}): AccountActivationService {
    const appOrigin = normalizeAppOrigin(dependencies.appUrl);
    const generateTokenBytes = dependencies.generateTokenBytes ?? (() => randomBytes(32));
    const now = dependencies.now ?? (() => new Date());

    return {
        getState: (input) => dependencies.repository.getState(input),

        async changePasswordAndSendRecoveryVerification(input) {
            const recoveryEmail = normalizeRecoveryEmail(input.recoveryEmail);
            return dependencies.repository.withProvisioningLock(input.identity.businessId, async () => {
                const account = await dependencies.repository.preparePasswordChange(input.identity);
                validateActivationPassword(input.newPassword, [account.loginAlias, account.businessName]);

                const user = await dependencies.logto.getUser(account.providerUserId);
                if (!isExactImportedLogtoUser(user, account)) {
                    throw new AccountActivationError("activation_unavailable");
                }

                const tokenBytes = generateTokenBytes();
                if (tokenBytes.byteLength < 32) throw new AccountActivationError("activation_not_configured");
                const rawToken = Buffer.from(tokenBytes).toString("base64url");
                const tokenHash = hashActivationToken(rawToken);
                const createdAt = now();
                const expiresAt = new Date(createdAt.getTime() + CHALLENGE_LIFETIME_MS);

                await dependencies.logto.setPassword(account.providerUserId, input.newPassword);
                await dependencies.repository.createRecoveryChallenge({
                    accountIssuanceId: account.accountIssuanceId,
                    appUserId: input.identity.appUserId,
                    businessId: input.identity.businessId,
                    createdAt,
                    expiresAt,
                    providerUserId: input.identity.logtoSub,
                    recoveryEmail,
                    tokenHash,
                });

                const verificationUrl = new URL("/api/panel/account-activation/verify", appOrigin);
                verificationUrl.searchParams.set("token", rawToken);
                let sent = false;
                try {
                    sent = await dependencies.emailSender.sendRecoveryVerification({
                        businessName: account.businessName,
                        expiresInMinutes: 30,
                        to: recoveryEmail,
                        verificationUrl: verificationUrl.toString(),
                    });
                } catch {
                    sent = false;
                }
                if (!sent) {
                    await dependencies.repository.invalidateRecoveryChallenge(tokenHash);
                    throw new AccountActivationError("activation_retry_later");
                }

                await dependencies.repository.markPasswordChanged(input.identity, tokenHash);
            });
        },

        async verifyRecoveryEmail(rawToken) {
            if (!rawToken || rawToken.length > 512 || /[\s\p{Cc}\p{Cf}]/u.test(rawToken)) return false;
            return dependencies.repository.consumeRecoveryChallenge(hashActivationToken(rawToken));
        },
    };
}

function mapIssuanceRow(row: Record<string, unknown>): ActivationIssuance {
    const state = mapAccountActivationState(stringValue(row.issuance_status));
    if (!state) throw new AccountActivationError("activation_unavailable");
    return {
        accountIssuanceId: stringValue(row.id),
        appUserId: stringValue(row.app_user_id),
        businessId: stringValue(row.business_id),
        businessName: stringValue(row.business_name),
        candidateId: stringValue(row.candidate_id),
        loginAlias: stringValue(row.login_alias),
        providerUserId: stringValue(row.provider_user_id),
        state,
    };
}

const EXACT_ISSUANCE_JOINS = `
    INNER JOIN business_import_candidates candidate ON candidate.id = issuance.candidate_id
    INNER JOIN businesses business ON business.id = issuance.business_id
    INNER JOIN app_users app_user ON app_user.id = issuance.app_user_id
    INNER JOIN auth_provider_links provider_link
        ON provider_link.app_user_id = issuance.app_user_id
       AND provider_link.provider = 'logto'
       AND provider_link.provider_user_id = issuance.provider_user_id
       AND provider_link.logto_user_id = issuance.provider_user_id
       AND provider_link.provider_email = issuance.login_alias
    INNER JOIN business_memberships membership
        ON membership.business_id = issuance.business_id
       AND membership.app_user_id = issuance.app_user_id
       AND membership.membership_status = 'active'
    INNER JOIN business_roles role
        ON role.id = membership.role_id
       AND role.business_id = membership.business_id
       AND role.role_key = 'owner'
       AND role.is_system = true
`;

const defaultExecute: QueryExecutor = async (text, values) => {
    const { query } = await import("../db/query.ts");
    return query(text, values) as Promise<QueryResult>;
};

const defaultTransactionRunner: TransactionRunner = async (operation) => {
    const { withTransaction } = await import("../db/transaction.ts");
    return withTransaction(({ query }) => operation(query as QueryExecutor));
};

const defaultProvisioningLockRunner: ProvisioningLockRunner = async (businessId, operation) => {
    const { businessProvisioningRepository } = await import("./repository.ts");
    return businessProvisioningRepository.withProvisioningLock(businessId, operation);
};

export function createPostgresAccountActivationRepository(dependencies: {
    execute?: QueryExecutor;
    runInTransaction?: TransactionRunner;
    withProvisioningLock?: ProvisioningLockRunner;
} = {}): AccountActivationRepository {
    const execute = dependencies.execute ?? defaultExecute;
    const runInTransaction = dependencies.runInTransaction ?? defaultTransactionRunner;
    const withProvisioningLock = dependencies.withProvisioningLock ?? defaultProvisioningLockRunner;

    return {
        withProvisioningLock,

        async getState(identity) {
            const result = await execute(
                `SELECT issuance.issuance_status,
                        issuance.app_user_id = $1::uuid
                        AND issuance.business_id = $2
                        AND issuance.provider_user_id = $3
                        AND EXISTS (
                            SELECT 1 FROM app_users app_user
                            WHERE app_user.id = issuance.app_user_id
                              AND app_user.email = issuance.login_alias
                        )
                        AND EXISTS (
                            SELECT 1 FROM auth_provider_links provider_link
                            WHERE provider_link.app_user_id = issuance.app_user_id
                              AND provider_link.provider = 'logto'
                              AND provider_link.provider_user_id = issuance.provider_user_id
                              AND provider_link.logto_user_id = issuance.provider_user_id
                              AND provider_link.provider_email = issuance.login_alias
                        )
                        AND EXISTS (
                            SELECT 1
                            FROM business_memberships membership
                            INNER JOIN business_roles role
                                ON role.id = membership.role_id
                               AND role.business_id = membership.business_id
                               AND role.role_key = 'owner'
                               AND role.is_system = true
                            WHERE membership.business_id = issuance.business_id
                              AND membership.app_user_id = issuance.app_user_id
                              AND membership.membership_status = 'active'
                        ) AS exact_binding
                 FROM business_account_issuances issuance
                 INNER JOIN business_import_candidates candidate ON candidate.id = issuance.candidate_id
                 INNER JOIN businesses business ON business.id = issuance.business_id
                 WHERE issuance.provider = 'logto'
                   AND (issuance.app_user_id = $1::uuid OR issuance.provider_user_id = $3)
                   AND candidate.candidate_status = 'published'
                   AND business.status = 'active'
                 LIMIT 2`,
                [identity.appUserId, identity.businessId, identity.logtoSub],
            );
            if (result.rows.length === 0) return null;
            if (result.rows.length !== 1) return "issued";
            return mapAccountActivationGateState(
                stringValue(result.rows[0]?.issuance_status),
                result.rows[0]?.exact_binding === true,
            );
        },

        async preparePasswordChange(identity) {
            return runInTransaction(async (transaction) => {
                const result = await transaction(
                    `SELECT issuance.id, issuance.candidate_id, issuance.business_id, issuance.app_user_id,
                            issuance.login_alias, issuance.provider_user_id, issuance.issuance_status,
                            business.name AS business_name,
                            NOT EXISTS (
                                SELECT 1 FROM business_recovery_contacts recent
                                WHERE recent.account_issuance_id = issuance.id
                                  AND recent.created_at > now() - interval '60 seconds'
                            ) AS activation_email_allowed
                     FROM business_account_issuances issuance
                     ${EXACT_ISSUANCE_JOINS}
                     WHERE issuance.app_user_id = $1::uuid
                       AND issuance.business_id = $2
                       AND issuance.provider = 'logto'
                       AND issuance.provider_user_id = $3
                       AND issuance.issuance_status IN ('issued', 'delivered', 'failed')
                       AND app_user.email = issuance.login_alias
                       AND candidate.candidate_status = 'published'
                       AND business.status = 'active'
                     LIMIT 2
                     FOR UPDATE OF issuance, provider_link, membership`,
                    [identity.appUserId, identity.businessId, identity.logtoSub],
                );
                if (result.rows.length !== 1) throw new AccountActivationError("activation_unavailable");
                if (result.rows[0]?.activation_email_allowed !== true) {
                    throw new AccountActivationError("activation_retry_later");
                }
                return mapIssuanceRow(result.rows[0]!);
            });
        },

        async createRecoveryChallenge(input) {
            await runInTransaction(async (transaction) => {
                const locked = await transaction(
                    `SELECT issuance.id
                     FROM business_account_issuances issuance
                     ${EXACT_ISSUANCE_JOINS}
                     WHERE issuance.id = $1::uuid
                       AND issuance.app_user_id = $2::uuid
                       AND issuance.business_id = $3
                       AND issuance.provider_user_id = $4
                       AND issuance.provider = 'logto'
                       AND issuance.issuance_status IN ('issued', 'delivered', 'failed')
                       AND candidate.candidate_status = 'published'
                       AND business.status = 'active'
                     LIMIT 2
                     FOR UPDATE OF issuance, provider_link, membership`,
                    [input.accountIssuanceId, input.appUserId, input.businessId, input.providerUserId],
                );
                if (locked.rows.length !== 1) throw new AccountActivationError("activation_unavailable");

                const limited = await transaction(
                    `SELECT 1
                     FROM business_recovery_contacts
                     WHERE account_issuance_id = $1::uuid
                       AND created_at > now() - interval '60 seconds'
                     LIMIT 1`,
                    [input.accountIssuanceId],
                );
                if (limited.rows.length > 0) throw new AccountActivationError("activation_retry_later");

                await transaction(
                    `UPDATE business_recovery_contacts
                     SET verification_used_at = now(), updated_at = now()
                     WHERE account_issuance_id = $1::uuid
                       AND verification_used_at IS NULL`,
                    [input.accountIssuanceId],
                );
                await transaction(
                    `INSERT INTO business_recovery_contacts (
                        account_issuance_id, recovery_channel, recovery_value,
                        verification_token_hash, verification_expires_at, created_at, updated_at
                     ) VALUES ($1::uuid, 'email', $2, $3, now() + interval '30 minutes', now(), now())`,
                    [input.accountIssuanceId, input.recoveryEmail, input.tokenHash],
                );
            });
        },

        async invalidateRecoveryChallenge(tokenHash) {
            await execute(
                `UPDATE business_recovery_contacts
                 SET verification_used_at = now(), updated_at = now()
                 WHERE verification_token_hash = $1
                   AND verification_used_at IS NULL`,
                [tokenHash],
            );
        },

        async markPasswordChanged(identity, tokenHash) {
            const result = await execute(
                `UPDATE business_account_issuances issuance
                 SET issuance_status = 'password_changed', updated_at = now()
                 FROM business_recovery_contacts recovery
                 WHERE recovery.account_issuance_id = issuance.id
                   AND recovery.verification_token_hash = $4
                   AND recovery.verification_used_at IS NULL
                   AND recovery.verification_expires_at > now()
                   AND issuance.app_user_id = $1::uuid
                   AND issuance.business_id = $2
                   AND issuance.provider = 'logto'
                   AND issuance.provider_user_id = $3
                   AND issuance.issuance_status IN ('issued', 'delivered', 'failed')
                 RETURNING issuance.id`,
                [identity.appUserId, identity.businessId, identity.logtoSub, tokenHash],
            );
            if (result.rows.length !== 1) throw new AccountActivationError("activation_retry_later");
        },

        async consumeRecoveryChallenge(tokenHash) {
            return runInTransaction(async (transaction) => {
                const challenge = await transaction(
                     `SELECT recovery.id, recovery.account_issuance_id
                      FROM business_recovery_contacts recovery
                      INNER JOIN business_account_issuances issuance ON issuance.id = recovery.account_issuance_id
                      ${EXACT_ISSUANCE_JOINS}
                      WHERE recovery.verification_token_hash = $1
                       AND recovery.verification_used_at IS NULL
                       AND recovery.verified_at IS NULL
                        AND recovery.verification_expires_at > now()
                        AND issuance.issuance_status = 'password_changed'
                        AND app_user.email = issuance.login_alias
                        AND candidate.candidate_status = 'published'
                        AND business.status = 'active'
                      LIMIT 2
                      FOR UPDATE OF recovery, issuance, provider_link, membership`,
                    [tokenHash],
                );
                if (challenge.rows.length !== 1) return false;
                const row = challenge.rows[0]!;
                const used = await transaction(
                    `UPDATE business_recovery_contacts
                     SET verification_used_at = now(), verified_at = now(), updated_at = now()
                     WHERE id = $1::uuid
                       AND verification_used_at IS NULL
                       AND verified_at IS NULL
                     RETURNING id`,
                    [row.id],
                );
                if (used.rows.length !== 1) return false;
                const activated = await transaction(
                    `UPDATE business_account_issuances
                     SET issuance_status = 'active', activated_at = now(), updated_at = now()
                     WHERE id = $1::uuid
                       AND issuance_status = 'password_changed'
                     RETURNING id`,
                    [row.account_issuance_id],
                );
                return activated.rows.length === 1;
            });
        },
    };
}

function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;",
    })[character]!);
}

export function createResendActivationEmailSender(input: {
    apiKey: string;
    fetch?: typeof fetch;
    from: string;
}): ActivationEmailSender {
    const fetchImpl = input.fetch ?? globalThis.fetch.bind(globalThis);
    return {
        async sendRecoveryVerification(message) {
            if (!input.apiKey.trim() || !input.from.trim()) return false;
            const businessName = escapeHtml(message.businessName);
            const verificationUrl = escapeHtml(message.verificationUrl);
            try {
                const response = await fetchImpl("https://api.resend.com/emails", {
                    body: JSON.stringify({
                        from: input.from,
                        html: `<!doctype html><html lang="tr"><body style="margin:0;background:#18181b;color:#f4f4f5;font-family:Arial,sans-serif"><div style="max-width:560px;margin:0 auto;padding:32px 20px"><div style="border-top:3px solid #fbbf24;background:#27272a;padding:28px"><h1 style="font-size:22px;margin:0 0 16px">Kurtarma e-postanizi dogrulayin</h1><p style="line-height:1.6;color:#d4d4d8">${businessName} hesabi icin kurtarma adresini etkinlestirin.</p><p><a href="${verificationUrl}" style="display:inline-block;background:#fbbf24;color:#18181b;padding:12px 18px;text-decoration:none;font-weight:700">E-postayi dogrula</a></p><p style="font-size:13px;color:#a1a1aa">Baglanti ${message.expiresInMinutes} dakika gecerlidir ve yalnizca bir kez kullanilabilir.</p></div></div></body></html>`,
                        subject: "Tik Profil kurtarma e-postasi dogrulamasi",
                        to: [message.to],
                    }),
                    cache: "no-store",
                    headers: {
                        authorization: `Bearer ${input.apiKey}`,
                        "content-type": "application/json",
                    },
                    method: "POST",
                });
                return response.ok;
            } catch {
                return false;
            }
        },
    };
}

let defaultServicePromise: Promise<AccountActivationService> | null = null;
const defaultRepository = createPostgresAccountActivationRepository();

async function getDefaultService(): Promise<AccountActivationService> {
    defaultServicePromise ??= Promise.all([
        import("../auth/logto/management-client.ts"),
        import("../../lib/env.ts"),
        import("./env.ts"),
    ]).then(async ([logtoModule, appEnv, importEnv]) => {
        const appUrl = appEnv.getAppUrl();
        const apiKey = appEnv.getOptionalEnvValue("RESEND_API_KEY");
        const from = importEnv.getBusinessImportRecoveryFromEmail();
        if (!appUrl || !apiKey || !from) throw new AccountActivationError("activation_not_configured");
        const logto = await logtoModule.createServerLogtoManagementClient();
        if (typeof logto.getUser !== "function") throw new AccountActivationError("activation_not_configured");
        return createAccountActivationService({
            appUrl,
            emailSender: createResendActivationEmailSender({ apiKey, from }),
            logto: {
                getUser: (userId) => logto.getUser(userId),
                setPassword: (userId, password) => logto.setPassword(userId, password),
            },
            repository: defaultRepository,
        });
    });
    return defaultServicePromise;
}

export async function getBusinessAccountActivation(identity: AccountActivationIdentity): Promise<ActivationState | null> {
    return defaultRepository.getState(identity);
}

export async function startBusinessAccountActivation(input: {
    identity: AccountActivationIdentity;
    newPassword: string;
    recoveryEmail: string;
}): Promise<void> {
    return (await getDefaultService()).changePasswordAndSendRecoveryVerification(input);
}

export async function verifyBusinessRecoveryEmail(rawToken: string): Promise<boolean> {
    if (!rawToken || rawToken.length > 512 || /[\s\p{Cc}\p{Cf}]/u.test(rawToken)) return false;
    return defaultRepository.consumeRecoveryChallenge(hashActivationToken(rawToken));
}
