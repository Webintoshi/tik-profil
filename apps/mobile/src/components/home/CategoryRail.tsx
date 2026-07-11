import * as React from "react";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from "react-native";

import type { KesfetBusiness, KesfetCategory } from "@/api/kesfet";
import { resolveBusinessCategory } from "@/business/category-catalog";
import { Icon } from "@/components/common/Icon";
import { CATEGORY_PAGE_SIZE, getCategoryGridGeometry, getCategoryTileHeight } from "@/performance/geometry";
import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";
import { selectionImpact } from "@/utils/haptics";

interface CategoryRailProps {
  businesses?: KesfetBusiness[];
  categories: KesfetCategory[];
  selectedId?: string | null;
  onSelect: (category: KesfetCategory | null) => void;
  requestedPage?: number;
  requestedPageKey?: number;
  onPageChange?: (page: number) => void;
  onPageCountChange?: (count: number) => void;
}

interface CategoryTileData {
  count: number;
  icon: string;
  id: string;
  label: string;
}

export function CategoryRail({
  businesses = [],
  categories,
  selectedId,
  onPageChange,
  onPageCountChange,
  onSelect,
  requestedPage,
  requestedPageKey
}: CategoryRailProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [query, setQuery] = React.useState("");
  const [activePage, setActivePage] = React.useState(0);
  const activePageRef = React.useRef(0);
  const scrollRef = React.useRef<ScrollView>(null);
  const canonicalCategories = React.useMemo(() => mergeCategories(categories), [categories]);
  const totalCount = canonicalCategories.reduce((sum, category) => sum + category.count, 0);
  const categoryGeometry = getCategoryGridGeometry(width);
  const gap = categoryGeometry.gap;
  const tileWidth = categoryGeometry.tileWidth;
  const normalizedQuery = normalizeCategoryId(query.trim());

  const tiles = React.useMemo<CategoryTileData[]>(() => [
    {
      count: totalCount,
      icon: "apps",
      id: "all",
      label: "Tümü"
    },
    ...canonicalCategories.map((category) => {
      const normalizedId = normalizeCategoryId(category.id);
      const normalizedLabel = normalizeCategoryId(category.label);

      return {
        count: category.count,
        icon: getCategoryIcon(normalizedId, normalizedLabel),
        id: category.id,
        label: formatCategoryLabel(category)
      };
    })
  ], [canonicalCategories, totalCount]);

  const visibleTiles = React.useMemo(() => {
    if (!normalizedQuery) {
      return tiles;
    }

    return tiles.filter((tile) => normalizeCategoryId(`${tile.id} ${tile.label}`).includes(normalizedQuery));
  }, [normalizedQuery, tiles]);

  const matchingBusinesses = React.useMemo(() => {
    if (!normalizedQuery) {
      return [];
    }

    return businesses
      .filter((business) => {
        const searchable = normalizeCategoryId([
          business.name,
          business.category,
          business.categoryLabel,
          business.district,
          business.city
        ].filter(Boolean).join(" "));

        return searchable.includes(normalizedQuery);
      })
      .slice(0, 4);
  }, [businesses, normalizedQuery]);

  const pages = React.useMemo(() => visibleTiles.length ? chunkTiles(visibleTiles, CATEGORY_PAGE_SIZE) : [], [visibleTiles]);

  const updateActivePage = React.useCallback((page: number) => {
    const maxPage = Math.max(0, pages.length - 1);
    const boundedPage = Math.max(0, Math.min(page, maxPage));

    if (activePageRef.current === boundedPage) {
      return;
    }

    activePageRef.current = boundedPage;
    setActivePage(boundedPage);
    onPageChange?.(boundedPage);
  }, [onPageChange, pages.length]);

  React.useEffect(() => {
    activePageRef.current = activePage;
  }, [activePage]);

  React.useEffect(() => {
    onPageCountChange?.(pages.length);
    if (activePage > pages.length - 1) {
      updateActivePage(pages.length - 1);
    }
  }, [activePage, onPageCountChange, pages.length, updateActivePage]);

  React.useEffect(() => {
    if (typeof requestedPage !== "number" || pages.length <= 1) {
      return;
    }

    const boundedPage = Math.max(0, Math.min(requestedPage, pages.length - 1));
    scrollRef.current?.scrollTo({ x: boundedPage * width, animated: true });
    updateActivePage(boundedPage);
  }, [pages.length, requestedPage, requestedPageKey, updateActivePage, width]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ x: 0, animated: false });
    updateActivePage(0);
  }, [normalizedQuery, updateActivePage]);

  function selectTile(tile: CategoryTileData) {
    selectionImpact();
    if (tile.id === "all") {
      onSelect(null);
      return;
    }

    const category = canonicalCategories.find((item) => item.id === tile.id) ?? null;
    onSelect(selectedId === tile.id ? null : category);
  }

  function openBusiness(business: KesfetBusiness) {
    selectionImpact();
    router.push(`/business/${business.slug}` as never);
  }

  return (
    <View style={{ gap: spacing.md, paddingHorizontal: spacing.screen }} testID="category-grid-loaded">
      <View
        style={{
          alignItems: "center",
          backgroundColor: colors.surface,
          borderColor: colors.brandSoft,
          borderRadius: radii.xl,
          borderWidth: 1,
          flexDirection: "row",
          gap: spacing.sm,
          minHeight: 50,
          paddingHorizontal: spacing.md,
          ...shadows.soft
        }}
      >
        <Icon name="search" color={colors.brand} size={19} strokeWidth={2.5} />
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setQuery}
          placeholder="Kategori ya da işletme ara"
          placeholderTextColor={colors.muted}
          selectionColor={colors.brand}
          style={{
            ...typography.body,
            color: colors.ink,
            flex: 1,
            minHeight: 48,
            outlineColor: "transparent",
            outlineStyle: "solid",
            outlineWidth: 0,
            padding: 0
          }}
          value={query}
        />
        {query ? (
          <Pressable
            accessibilityLabel="Aramayı temizle"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setQuery("")}
            style={({ pressed }) => ({
              alignItems: "center",
              backgroundColor: colors.backgroundAlt,
              borderRadius: radii.pill,
              height: 30,
              justifyContent: "center",
              opacity: pressed ? 0.82 : 1,
              width: 30
            })}
          >
            <Icon name="x" color={colors.mutedStrong} size={15} strokeWidth={2.6} />
          </Pressable>
        ) : null}
      </View>

      {matchingBusinesses.length ? (
        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.brandSoft,
            borderRadius: radii.xl,
            borderWidth: 1,
            gap: spacing.sm,
            padding: spacing.md,
            ...shadows.soft
          }}
        >
          <Text style={{ ...typography.label, color: colors.ink }}>
            İşletme sonuçları
          </Text>
          <View style={{ gap: spacing.sm }}>
            {matchingBusinesses.map((business) => (
              <BusinessSearchResult
                business={business}
                key={business.id}
                onPress={() => openBusiness(business)}
              />
            ))}
          </View>
        </View>
      ) : null}

      {pages.length ? (
        <ScrollView
          decelerationRate="fast"
          horizontal
          ref={scrollRef}
          onMomentumScrollEnd={(event) => {
            const nextPage = Math.round(event.nativeEvent.contentOffset.x / width);
            updateActivePage(nextPage);
          }}
          onScroll={(event) => {
            const nextPage = Math.round(event.nativeEvent.contentOffset.x / width);
            updateActivePage(nextPage);
          }}
          pagingEnabled
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          snapToInterval={width}
          style={{ marginHorizontal: -spacing.screen }}
        >
          {pages.map((page, pageIndex) => (
            <View
              key={`category-page-${pageIndex}`}
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap,
                paddingHorizontal: spacing.screen,
                width
              }}
            >
              {buildPageSlots(page).map((tile, slotIndex) => (
                tile ? (
                  <CategoryTile
                    key={tile.id}
                    tile={tile}
                    selected={tile.id === "all" ? !selectedId : selectedId === tile.id}
                    width={tileWidth}
                    onPress={() => selectTile(tile)}
                  />
                ) : (
                  <View
                    key={`category-empty-${pageIndex}-${slotIndex}`}
                    style={{ height: categoryGeometry.tileHeight, opacity: 0, pointerEvents: "none", width: tileWidth }}
                  />
                )
              ))}
            </View>
          ))}
        </ScrollView>
      ) : matchingBusinesses.length ? null : (
        <View
          style={{
            alignItems: "center",
            backgroundColor: colors.surface,
            borderColor: colors.brandSoft,
            borderRadius: radii.xl,
            borderWidth: 1,
            gap: spacing.xs,
            justifyContent: "center",
            minHeight: 96,
            padding: spacing.lg
          }}
        >
          <Icon name="search" color={colors.muted} size={22} />
          <Text style={{ ...typography.label, color: colors.ink }}>Kategori veya işletme bulunamadı</Text>
        </View>
      )}
    </View>
  );
}

function BusinessSearchResult({
  business,
  onPress
}: {
  business: KesfetBusiness;
  onPress: () => void;
}) {
  const imageUri = business.logoUrl ?? business.coverImage;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor: colors.backgroundAlt,
        borderColor: colors.brandSoft,
        borderRadius: radii.lg,
        borderWidth: 1,
        flexDirection: "row",
        gap: spacing.sm,
        opacity: pressed ? 0.86 : 1,
        padding: spacing.sm
      })}
    >
      <View
        style={{
          alignItems: "center",
          backgroundColor: colors.brandSoft,
          borderRadius: radii.lg,
          height: 48,
          justifyContent: "center",
          overflow: "hidden",
          width: 48
        }}
      >
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={{ height: "100%", width: "100%" }} contentFit="cover" />
        ) : (
          <Icon name="store" color={colors.brand} size={22} />
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={1} style={{ ...typography.label, color: colors.ink }}>
          {business.name}
        </Text>
        <Text numberOfLines={1} style={{ ...typography.small, color: colors.muted }}>
          {[business.categoryLabel, business.district || business.city].filter(Boolean).join(" · ")}
        </Text>
      </View>
      <Icon name="chevron" color={colors.brand} size={16} strokeWidth={2.8} />
    </Pressable>
  );
}

function chunkTiles(tiles: CategoryTileData[], size: number) {
  const chunks: CategoryTileData[][] = [];
  for (let index = 0; index < tiles.length; index += size) {
    chunks.push(tiles.slice(index, index + size));
  }
  return chunks;
}

function buildPageSlots(page: CategoryTileData[]) {
  return Array.from({ length: CATEGORY_PAGE_SIZE }, (_, index) => page[index] ?? null);
}

function mergeCategories(categories: KesfetCategory[]) {
  const merged = new Map<string, KesfetCategory>();

  categories.forEach((category) => {
    const resolved = resolveBusinessCategory(category.id, category.label);
    const current = merged.get(resolved.id);
    if (current) {
      merged.set(resolved.id, {
        ...current,
        count: current.count + category.count
      });
      return;
    }

    merged.set(resolved.id, {
      ...category,
      emoji: resolved.emoji,
      id: resolved.id,
      label: resolved.label
    });
  });

  return Array.from(merged.values()).sort((a, b) => b.count - a.count);
}

function CategoryTile({
  onPress,
  selected,
  tile,
  width
}: {
  onPress: () => void;
  selected: boolean;
  tile: CategoryTileData;
  width: number;
}) {
  const iconSize = Math.round(width * 0.44);
  const iconFrameSize = Math.round(width * 0.62);
  const tileHeight = getCategoryTileHeight(width);
  const selectedFrameColor = colors.brand;
  const selectedGlyphColor = colors.onBrand;
  const selectedGlowColor = colors.brandGlow;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        outlineColor: "transparent",
        outlineStyle: "solid",
        outlineWidth: 0,
        transform: [{ scale: pressed ? 0.97 : 1 }],
        opacity: pressed ? 0.9 : 1,
        width
      })}
    >
      <View
        style={{
          alignItems: "center",
          height: tileHeight,
          gap: spacing.xs,
          justifyContent: "center",
          overflow: "visible",
          paddingTop: spacing.sm,
          position: "relative",
          width
        }}
      >
        <View
          style={{
            alignItems: "center",
            backgroundColor: selected ? selectedFrameColor : "transparent",
            borderColor: "transparent",
            borderRadius: radii.pill,
            borderWidth: 0,
            height: iconFrameSize,
            justifyContent: "center",
            overflow: "visible",
            position: "relative",
            width: iconFrameSize
          }}
        >
          {selected ? (
            <View
              style={{
                backgroundColor: selectedGlowColor,
                borderRadius: radii.pill,
                bottom: 0,
                left: 0,
                opacity: 1,
                position: "absolute",
                right: 0,
                top: 0,
                transform: [{ scale: 1.14 }]
              }}
            />
          ) : null}
          <MaterialCategoryIcon
            color={selected ? selectedGlyphColor : colors.categoryIcon}
            name={tile.icon}
            size={iconSize}
          />
        </View>

        <Text
          numberOfLines={2}
          style={{
            ...typography.label,
            color: selected ? colors.brand : colors.ink,
            lineHeight: 16,
            minHeight: 32,
            paddingHorizontal: 2,
            textAlign: "center"
          }}
        >
          {tile.label}
        </Text>
      </View>
    </Pressable>
  );
}

function MaterialCategoryIcon({
  color,
  name,
  size
}: {
  color: string;
  name: string;
  size: number;
}) {
  return (
    <Text
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{
        color,
        fontFamily: "MaterialSymbols_300Light",
        fontSize: size,
        lineHeight: size,
        textAlign: "center"
      }}
    >
      {name}
    </Text>
  );
}

function normalizeCategoryId(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/&/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function formatCategoryLabel(category: KesfetCategory) {
  const labelById: Record<string, string> = {
    arac_kiralama: "Araç Kiralama",
    e_ticaret: "E-Ticaret",
    emlak_ofisi: "Emlak Ofisi",
    fast_food: "Fast Food",
    fast_food_burger: "Fast Food",
    kahve_shop: "Kahve Shop",
    klinik_saglik: "Klinik & Sağlık",
    otel_konaklama: "Otel & Konaklama",
    other: "Diğer",
    petshop: "Petshop",
    restoran: "Restoran"
  };

  const normalizedId = normalizeCategoryId(category.id);
  const normalizedLabel = normalizeCategoryId(category.label);

  if (normalizedId.includes("fast_food") || normalizedLabel.includes("fast_food")) {
    return "Fast Food";
  }
  if (normalizedId.includes("klinik") || normalizedLabel.includes("klinik")) {
    return "Klinik & Sağlık";
  }
  if (normalizedId.includes("arac") || normalizedLabel.includes("arac")) {
    return "Araç Kiralama";
  }
  if (normalizedId.includes("otel") || normalizedLabel.includes("otel")) {
    return "Otel & Konaklama";
  }
  if (normalizedId.includes("other") || normalizedLabel.includes("other")) {
    return "Diğer";
  }

  return labelById[normalizedId] ?? category.label;
}

function getCategoryIcon(normalizedId: string, normalizedLabel: string) {
  if (normalizedId.includes("fast_food") || normalizedLabel.includes("fast_food")) {
    return "lunch_dining";
  }
  if (normalizedId.includes("emlak") || normalizedLabel.includes("emlak")) {
    return "home";
  }
  if (normalizedId.includes("klinik") || normalizedLabel.includes("klinik")) {
    return "medical_services";
  }
  if (normalizedId.includes("arac") || normalizedLabel.includes("arac")) {
    return "directions_car";
  }
  if (normalizedId.includes("otel") || normalizedLabel.includes("otel")) {
    return "hotel";
  }
  if (normalizedId.includes("kahve") || normalizedLabel.includes("kahve")) {
    return "local_cafe";
  }
  if (normalizedId.includes("restoran") || normalizedLabel.includes("restoran")) {
    return "restaurant";
  }
  if (normalizedId.includes("ticaret") || normalizedLabel.includes("ticaret")) {
    return "shopping_bag";
  }
  if (normalizedId.includes("pet") || normalizedLabel.includes("pet")) {
    return "pets";
  }

  return "storefront";
}
