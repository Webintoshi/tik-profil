import "server-only";

function getTrimmedEnvValue(name: string): string | undefined {
    const value = process.env[name];
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
}

export function getGoogleMapsApiKey(): string | undefined {
    return getTrimmedEnvValue("GOOGLE_MAPS_API_KEY");
}

export function getLogtoManagementAppId(): string | undefined {
    return getTrimmedEnvValue("LOGTO_MANAGEMENT_APP_ID");
}

export function getLogtoManagementAppSecret(): string | undefined {
    return getTrimmedEnvValue("LOGTO_MANAGEMENT_APP_SECRET");
}

export function getLogtoManagementApiResource(): string | undefined {
    return getTrimmedEnvValue("LOGTO_MANAGEMENT_API_RESOURCE");
}

export function getLogtoManagementCredentials(): { appId: string; appSecret: string } | null {
    const appId = getLogtoManagementAppId();
    const appSecret = getLogtoManagementAppSecret();
    return appId && appSecret ? { appId, appSecret } : null;
}

export function getBusinessImportRecoveryFromEmail(): string | undefined {
    return getTrimmedEnvValue("BUSINESS_IMPORT_RECOVERY_FROM_EMAIL");
}
