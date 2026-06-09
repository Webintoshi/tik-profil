import { resolveApiRuntimeConfig } from "@/api/config";
import { createMockDiscoveryApi } from "@/api/mock-discovery-api";
import { createRealDiscoveryApi } from "@/api/real-discovery-api";
import type { DiscoveryApi, ApiRuntimeConfig } from "@/api/types";

let cachedApi: DiscoveryApi | null = null;

export function createDiscoveryApi(
  overrides: Partial<ApiRuntimeConfig> = {},
): DiscoveryApi {
  const config = resolveApiRuntimeConfig(overrides);

  if (config.mode === "real") {
    return createRealDiscoveryApi(config);
  }

  return createMockDiscoveryApi(config);
}

export function getDiscoveryApi(): DiscoveryApi {
  if (!cachedApi) {
    cachedApi = createDiscoveryApi();
  }

  return cachedApi;
}
