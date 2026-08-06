import type { ApiRuntimeConfig } from "@/api/types";

export const defaultApiConfig: ApiRuntimeConfig = {
  mode: "real",
  baseUrl: "https://tikprofil.com",
  requestTimeoutMs: 8000,
  mockDelayMs: 550,
  publicBusinessProfilePathTemplate: "",
};

export function resolveApiRuntimeConfig(
  overrides: Partial<ApiRuntimeConfig> = {},
): ApiRuntimeConfig {
  return {
    ...defaultApiConfig,
    mode:
      (overrides.mode ??
        (process.env.EXPO_PUBLIC_API_MODE as ApiRuntimeConfig["mode"] | undefined) ??
        defaultApiConfig.mode),
    baseUrl:
      overrides.baseUrl ??
      process.env.EXPO_PUBLIC_API_BASE_URL ??
      defaultApiConfig.baseUrl,
    publicBusinessProfilePathTemplate:
      overrides.publicBusinessProfilePathTemplate ??
      process.env.EXPO_PUBLIC_BUSINESS_PROFILE_PATH_TEMPLATE ??
      defaultApiConfig.publicBusinessProfilePathTemplate,
    requestTimeoutMs:
      overrides.requestTimeoutMs ?? defaultApiConfig.requestTimeoutMs,
    mockDelayMs: overrides.mockDelayMs ?? defaultApiConfig.mockDelayMs,
  };
}
