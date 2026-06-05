import { getDiscoveryApi } from "@/api";
import { useAsyncResource } from "@/hooks/use-async-resource";
import type { SearchResponse } from "@/types/business";
import type { SelectedLocation } from "@/types/location";

export function useBusinessSearch(
  query: string,
  location: SelectedLocation | null,
) {
  const normalizedQuery = query.trim();

  return useAsyncResource<SearchResponse>({
    enabled: normalizedQuery.length > 0,
    initialData: {
      businesses: [],
      total: 0,
    },
    deps: [normalizedQuery, location?.city, location?.district],
    load: () =>
      getDiscoveryApi().searchBusinesses({
        query: normalizedQuery,
        city: location?.city,
        district: location?.district,
        lat: location?.latitude,
        lng: location?.longitude,
      }),
  });
}
