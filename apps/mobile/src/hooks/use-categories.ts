import { getDiscoveryApi } from "@/api";
import { useAsyncResource } from "@/hooks/use-async-resource";
import type { CategorySummary } from "@/types/business";

export function useCategories() {
  return useAsyncResource<CategorySummary[]>({
    initialData: [],
    deps: [],
    load: () => getDiscoveryApi().getCategories(),
  });
}
