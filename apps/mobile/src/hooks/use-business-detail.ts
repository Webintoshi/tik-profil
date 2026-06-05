import { getDiscoveryApi } from "@/api";
import { useAsyncResource } from "@/hooks/use-async-resource";
import type { BusinessProfile } from "@/types/business";

export function useBusinessDetail(slug: string | string[] | undefined) {
  const resolvedSlug = Array.isArray(slug) ? slug[0] : slug;

  return useAsyncResource<BusinessProfile | null>({
    enabled: Boolean(resolvedSlug),
    initialData: null,
    deps: [resolvedSlug],
    load: () => getDiscoveryApi().getBusinessBySlug(resolvedSlug ?? ""),
  });
}
