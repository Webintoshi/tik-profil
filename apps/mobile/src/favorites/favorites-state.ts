interface FavoriteCandidate {
  slug: string;
}

export type FavoritesListItem<TBusiness> =
  | { key: "empty"; kind: "empty" }
  | { business: TBusiness; key: string; kind: "favorite" }
  | { count: number; key: string; kind: "group-heading"; label: string }
  | { key: "recommendation-heading"; kind: "recommendation-heading" }
  | { business: TBusiness; key: string; kind: "recommendation" };

export function buildFavoritesListModel<TBusiness extends FavoriteCandidate>(
  businesses: readonly TBusiness[],
  favoriteSlugs: readonly string[],
  getCategoryLabel: (business: TBusiness) => string
) {
  const bySlug = new Map(businesses.map((business) => [business.slug, business]));
  const favorites = favoriteSlugs.flatMap((slug) => {
    const business = bySlug.get(slug);
    return business ? [business] : [];
  });
  const favoriteSet = new Set(favorites.map((business) => business.slug));
  const grouped = favorites.length >= 7;
  const items: FavoritesListItem<TBusiness>[] = [];

  if (grouped) {
    const groups = new Map<string, TBusiness[]>();
    for (const business of favorites) {
      const label = getCategoryLabel(business);
      groups.set(label, [...(groups.get(label) ?? []), business]);
    }
    for (const [label, group] of [...groups.entries()].sort(([left], [right]) => left.localeCompare(right, "tr-TR"))) {
      items.push({ count: group.length, key: `group:${label}`, kind: "group-heading", label });
      items.push(...group.map((business) => ({ business, key: `favorite:${business.slug}`, kind: "favorite" as const })));
    }
  } else {
    items.push(...favorites.map((business) => ({ business, key: `favorite:${business.slug}`, kind: "favorite" as const })));
  }

  if (favorites.length === 0) items.push({ key: "empty", kind: "empty" });

  if (favorites.length <= 2) {
    const recommendations = businesses.filter((business) => !favoriteSet.has(business.slug)).slice(0, 3);
    if (recommendations.length) {
      items.push({ key: "recommendation-heading", kind: "recommendation-heading" });
      items.push(...recommendations.map((business) => ({
        business,
        key: `recommendation:${business.slug}`,
        kind: "recommendation" as const
      })));
    }
  }

  return { favoriteCount: favorites.length, grouped, items } as const;
}
