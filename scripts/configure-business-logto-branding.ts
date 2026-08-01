import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
    buildBusinessBrandingPayload,
    summarizeBrandingConfiguration,
    type BusinessBrandingPayload,
} from "../src/server/auth/logto/business-branding";

type JsonRecord = Record<string, unknown>;

export interface BrandingCliOptions {
    allowDefaultFallback: boolean;
    backupPath: string | null;
    mode: "apply" | "inspect" | "restore";
    restorePath: string | null;
}

export function parseBrandingCliArgs(args: string[]): BrandingCliOptions {
    const options: BrandingCliOptions = {
        allowDefaultFallback: false,
        backupPath: null,
        mode: "inspect",
        restorePath: null,
    };

    for (let index = 0; index < args.length; index += 1) {
        const value = args[index];

        if (value === "--apply") {
            options.mode = "apply";
        } else if (value === "--inspect") {
            options.mode = "inspect";
        } else if (value === "--allow-default-fallback") {
            options.allowDefaultFallback = true;
        } else if (value === "--backup") {
            const path = args[index + 1];
            if (!path) throw new Error("backup_path_required");
            options.backupPath = path;
            index += 1;
        } else if (value === "--restore") {
            const path = args[index + 1];
            if (!path) throw new Error("restore_path_required");
            options.mode = "restore";
            options.restorePath = path;
            index += 1;
        } else {
            throw new Error(`unknown_argument:${value}`);
        }
    }

    return options;
}

export function buildDefaultFallbackPayload(
    current: JsonRecord,
    branding: BusinessBrandingPayload,
): JsonRecord {
    return {
        branding: branding.branding,
        color: branding.color,
        customCss: branding.customCss,
        hideLogtoBranding: true,
        privacyPolicyUrl: branding.privacyPolicyUrl,
        signIn: current.signIn,
        signInMode: "SignIn",
        socialSignInConnectorTargets: [],
        termsOfUseUrl: branding.termsOfUseUrl,
    };
}

interface RuntimeConfig {
    applicationId: string;
    baseUrl: string;
    endpoint: string;
    managementAppId: string;
    managementAppSecret: string;
    managementResource: string;
}

function requireEnv(name: string): string {
    const value = process.env[name]?.trim();
    if (!value) throw new Error(`missing_environment:${name}`);
    return value;
}

function readRuntimeConfig(): RuntimeConfig {
    return {
        applicationId: requireEnv("LOGTO_APP_ID"),
        baseUrl: requireEnv("LOGTO_BASE_URL"),
        endpoint: requireEnv("LOGTO_ENDPOINT").replace(/\/+$/, ""),
        managementAppId: requireEnv("LOGTO_MANAGEMENT_APP_ID"),
        managementAppSecret: requireEnv("LOGTO_MANAGEMENT_APP_SECRET"),
        managementResource: requireEnv("LOGTO_MANAGEMENT_API_RESOURCE"),
    };
}

async function getAccessToken(config: RuntimeConfig): Promise<string> {
    const body = new URLSearchParams({
        client_id: config.managementAppId,
        client_secret: config.managementAppSecret,
        grant_type: "client_credentials",
        resource: config.managementResource,
        scope: "all",
    });
    const response = await fetch(`${config.endpoint}/oidc/token`, {
        body,
        headers: { "content-type": "application/x-www-form-urlencoded" },
        method: "POST",
    });
    const payload = await response.json() as { access_token?: string };

    if (!response.ok || !payload.access_token) {
        throw new Error(`management_token_failed:${response.status}`);
    }

    return payload.access_token;
}

async function requestJson(
    config: RuntimeConfig,
    accessToken: string,
    path: string,
    init: RequestInit = {},
): Promise<{ body: JsonRecord | null; status: number }> {
    const response = await fetch(`${config.endpoint}${path}`, {
        ...init,
        headers: {
            authorization: `Bearer ${accessToken}`,
            ...(init.body ? { "content-type": "application/json" } : {}),
            ...init.headers,
        },
    });
    const body = await response.json().catch(() => null) as JsonRecord | null;
    return { body, status: response.status };
}

async function readCurrentConfiguration(config: RuntimeConfig, accessToken: string) {
    const [application, appLevel, defaultExperience] = await Promise.all([
        requestJson(config, accessToken, `/api/applications/${config.applicationId}`),
        requestJson(config, accessToken, `/api/applications/${config.applicationId}/sign-in-experience`),
        requestJson(config, accessToken, "/api/sign-in-exp"),
    ]);

    if (application.status !== 200 || defaultExperience.status !== 200) {
        throw new Error(`configuration_read_failed:${application.status}:${defaultExperience.status}`);
    }

    return {
        appLevel: appLevel.status === 200 ? appLevel.body : null,
        application: application.body,
        defaultExperience: defaultExperience.body ?? {},
    };
}

function safeSnapshot(configuration: Awaited<ReturnType<typeof readCurrentConfiguration>>) {
    return {
        appLevel: summarizeBrandingConfiguration(configuration.appLevel),
        application: {
            id: configuration.application?.id ?? null,
            isThirdParty: configuration.application?.isThirdParty ?? null,
            name: configuration.application?.name ?? null,
            type: configuration.application?.type ?? null,
        },
        defaultExperience: summarizeBrandingConfiguration(configuration.defaultExperience),
    };
}

function defaultBackupPath(): string {
    return join(tmpdir(), `tikprofil-logto-branding-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
}

async function inspect(config: RuntimeConfig, accessToken: string): Promise<void> {
    const current = await readCurrentConfiguration(config, accessToken);
    console.log(JSON.stringify({ mode: "inspect", ...safeSnapshot(current) }, null, 2));
}

async function apply(
    config: RuntimeConfig,
    accessToken: string,
    options: BrandingCliOptions,
): Promise<void> {
    const current = await readCurrentConfiguration(config, accessToken);
    const backupPath = options.backupPath ?? defaultBackupPath();
    await writeFile(backupPath, JSON.stringify({
        applicationId: config.applicationId,
        appLevel: current.appLevel,
        defaultExperience: current.defaultExperience,
    }, null, 2), { encoding: "utf8", mode: 0o600 });

    const branding = buildBusinessBrandingPayload(config.baseUrl);
    const appLevelResult = await requestJson(
        config,
        accessToken,
        `/api/applications/${config.applicationId}/sign-in-experience`,
        { body: JSON.stringify(branding), method: "PUT" },
    );

    if (appLevelResult.status >= 200 && appLevelResult.status < 300) {
        console.log(JSON.stringify({
            backupPath,
            mode: "apply",
            target: "application",
            result: summarizeBrandingConfiguration(appLevelResult.body),
        }, null, 2));
        return;
    }

    if (!options.allowDefaultFallback) {
        throw new Error(`application_branding_unsupported:${appLevelResult.status}`);
    }

    const fallbackPayload = buildDefaultFallbackPayload(current.defaultExperience, branding);
    const fallbackResult = await requestJson(config, accessToken, "/api/sign-in-exp", {
        body: JSON.stringify(fallbackPayload),
        method: "PATCH",
    });

    if (fallbackResult.status < 200 || fallbackResult.status >= 300) {
        throw new Error(`default_branding_failed:${fallbackResult.status}`);
    }

    console.log(JSON.stringify({
        backupPath,
        mode: "apply",
        target: "default",
        result: summarizeBrandingConfiguration(fallbackResult.body),
    }, null, 2));
}

async function restore(
    config: RuntimeConfig,
    accessToken: string,
    restorePath: string,
): Promise<void> {
    const backup = JSON.parse(await readFile(restorePath, "utf8")) as {
        appLevel?: JsonRecord | null;
        applicationId?: string;
        defaultExperience?: JsonRecord;
    };

    if (backup.applicationId !== config.applicationId || !backup.defaultExperience) {
        throw new Error("invalid_backup");
    }

    const defaultPayload = {
        branding: backup.defaultExperience.branding,
        color: backup.defaultExperience.color,
        customCss: backup.defaultExperience.customCss ?? null,
        hideLogtoBranding: backup.defaultExperience.hideLogtoBranding,
        privacyPolicyUrl: backup.defaultExperience.privacyPolicyUrl ?? null,
        signIn: backup.defaultExperience.signIn,
        signInMode: backup.defaultExperience.signInMode,
        socialSignInConnectorTargets: backup.defaultExperience.socialSignInConnectorTargets,
        termsOfUseUrl: backup.defaultExperience.termsOfUseUrl ?? null,
    };
    const restoredDefault = await requestJson(config, accessToken, "/api/sign-in-exp", {
        body: JSON.stringify(defaultPayload),
        method: "PATCH",
    });

    if (restoredDefault.status < 200 || restoredDefault.status >= 300) {
        throw new Error(`default_restore_failed:${restoredDefault.status}`);
    }

    if (backup.appLevel) {
        const restoredApp = await requestJson(
            config,
            accessToken,
            `/api/applications/${config.applicationId}/sign-in-experience`,
            { body: JSON.stringify(backup.appLevel), method: "PUT" },
        );
        if (restoredApp.status < 200 || restoredApp.status >= 300) {
            throw new Error(`application_restore_failed:${restoredApp.status}`);
        }
    }

    console.log(JSON.stringify({ mode: "restore", restoredFrom: restorePath }, null, 2));
}

async function main(): Promise<void> {
    const options = parseBrandingCliArgs(process.argv.slice(2));
    const config = readRuntimeConfig();
    const accessToken = await getAccessToken(config);

    if (options.mode === "inspect") {
        await inspect(config, accessToken);
    } else if (options.mode === "apply") {
        await apply(config, accessToken, options);
    } else {
        await restore(config, accessToken, options.restorePath as string);
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    });
}
