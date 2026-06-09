import { getDiscoveryApi } from "@/api";
import { useAsyncResource } from "@/hooks/use-async-resource";
import type { DiscoveryResponse } from "@/types/business";
import type { SelectedLocation } from "@/types/location";

export function useDiscoveryFeed(
  location: SelectedLocation | null,
  category?: string,
) {
  return useAsyncResource<DiscoveryResponse>({
    enabled: Boolean(location),
    initialData: {
      businesses: [],
      total: 0,
      page: 1,
      limit: 20,
      hasMore: false,
    },
    deps: [
      location?.city,
      location?.district,
      location?.neighborhood,
      location?.latitude,
      location?.longitude,
      category,
    ],
    load: () =>
      getDiscoveryApi().getDiscoveryBusinesses({
        city: location?.city,
        district: location?.district,
        neighborhood: location?.neighborhood,
        lat: location?.latitude,
        lng: location?.longitude,
        category: category && category !== "all" ? category : undefined,
      }),
  });
}
