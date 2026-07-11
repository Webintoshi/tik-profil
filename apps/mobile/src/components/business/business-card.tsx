import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Pressable, Text, View, type ViewStyle } from "react-native";

import type { KesfetBusiness } from "@/api/kesfet";
import { resolveBusinessCategory } from "@/business/category-catalog";
import { Icon } from "@/components/common/Icon";
import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";
import { useThemeMode } from "@/theme/theme-store";
import { lightImpact } from "@/utils/haptics";

interface BusinessCardProps {
  business: KesfetBusiness;
  variant?: "featured" | "compact" | "horizontal";
  favorite?: boolean;
  onFavoritePress?: (business: KesfetBusiness) => void;
}

interface BusinessProfileCardProps extends BusinessCardProps {
  density?: "regular" | "compact";
}

function formatDistance(distance: number | null) {
  if (distance === null || distance === undefined || distance > 1000) {
    return null;
  }
  if (distance < 1) {
    return `${Math.max(100, Math.round(distance * 1000 / 50) * 50)} m`;
  }
  return `${distance.toFixed(distance >= 10 ? 0 : 1)} km`;
}

export function BusinessCard({
  business,
  variant = "featured",
  favorite = false,
  onFavoritePress
}: BusinessCardProps) {
  if (variant === "compact") {
    return (
      <DenseBusinessListCard
        business={business}
        favorite={favorite}
        onFavoritePress={onFavoritePress}
      />
    );
  }

  if (variant === "horizontal") {
    return (
      <HorizontalBusinessCard
        business={business}
        favorite={favorite}
        onFavoritePress={onFavoritePress}
      />
    );
  }

  return (
    <BusinessProfileCard
      business={business}
      density="regular"
      favorite={favorite}
      onFavoritePress={onFavoritePress}
    />
  );
}

export function BusinessProfileCard({
  business,
  density = "regular",
  favorite = false,
  onFavoritePress
}: BusinessProfileCardProps) {
  const router = useRouter();
  const category = resolveBusinessCategory(
    business.category,
    business.categoryLabel,
    business.industryId
  ).label;
  const coverUri = business.coverImage ?? business.logoUrl;
  const logoUri = business.logoUrl;
  const location = business.district || business.city || "Ordu";
  const isPopular = Boolean(business.rating && business.rating >= 4.6);
  const coverHeight = density === "compact" ? 108 : 134;
  const avatarSize = density === "compact" ? 62 : 74;

  function openDetail() {
    lightImpact();
    router.push(`/business/${business.slug}` as never);
  }

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.brandSoft,
        borderRadius: density === "compact" ? 20 : 22,
        borderWidth: 1,
        overflow: "hidden",
        position: "relative",
        ...shadows.card
      }}
    >
      <Pressable
        accessibilityRole="button"
        onPress={openDetail}
        style={({ pressed }) => ({
          opacity: pressed ? 0.96 : 1
        })}
      >
        <View style={{ height: coverHeight, overflow: "hidden", position: "relative" }}>
          {coverUri ? (
            <Image cachePolicy="memory-disk" source={{ uri: coverUri }} style={{ height: "100%", width: "100%" }} contentFit="cover" recyclingKey={`${business.id}:cover`} transition={0} />
          ) : (
            <LinearGradient
              colors={[colors.brandDeep, colors.brand]}
              style={{ alignItems: "center", flex: 1, justifyContent: "center" }}
            >
              <Icon name="store" color={colors.inverseText} size={42} />
            </LinearGradient>
          )}
          {isPopular ? (
            <View
              style={{
                alignItems: "center",
                backgroundColor: colors.brandBadge,
                borderColor: "rgba(255,255,255,0.20)",
                borderRadius: radii.pill,
                borderWidth: 1,
                flexDirection: "row",
                gap: 5,
                paddingHorizontal: spacing.sm,
                paddingVertical: 6,
                position: "absolute",
                right: spacing.md,
                top: spacing.md
              }}
            >
              <Text style={{ fontSize: 11, lineHeight: 13 }}>🔥</Text>
              <Text style={{ ...typography.small, color: colors.inverseText }}>
                Popüler Mekân
              </Text>
            </View>
          ) : null}
        </View>

        <View
          style={{
            gap: spacing.sm,
            paddingBottom: density === "compact" ? spacing.md : spacing.lg,
            paddingHorizontal: density === "compact" ? spacing.md : spacing.lg
          }}
        >
          <View style={{ flexDirection: "row", gap: density === "compact" ? spacing.sm : spacing.md }}>
            <BusinessLogoMark
              uri={logoUri}
              recyclingKey={`${business.id}:logo`}
              size={avatarSize}
              style={{ marginTop: -Math.round(avatarSize * 0.42) }}
              verified={isPopular}
            />

            <View
              style={{
                flex: 1,
                gap: density === "compact" ? 2 : spacing.xs,
                paddingRight: 44,
                paddingTop: density === "compact" ? spacing.sm : spacing.md
              }}
            >
              <Text
                numberOfLines={density === "compact" ? 1 : 2}
                style={{
                  ...typography.sectionTitle,
                  color: colors.ink,
                  fontSize: density === "compact" ? 17 : 18,
                  lineHeight: density === "compact" ? 21 : 23
                }}
              >
                {business.name}
              </Text>
              <Text numberOfLines={1} style={{ ...typography.small, color: colors.muted }}>
                {category}
                {location ? ` · ${location}` : ""}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>

      {onFavoritePress ? (
        <View style={{ position: "absolute", right: spacing.md, top: coverHeight + spacing.sm }}>
          <FavoriteButton
            business={business}
            favorite={favorite}
            onFavoritePress={onFavoritePress}
            large={density !== "compact"}
          />
        </View>
      ) : null}
    </View>
  );
}

function DenseBusinessListCard({
  business,
  favorite = false,
  onFavoritePress
}: BusinessCardProps) {
  const router = useRouter();
  const categoryInfo = resolveBusinessCategory(
    business.category,
    business.categoryLabel,
    business.industryId
  );
  const category = categoryInfo.label;
  const categoryIcon = getBusinessCategoryIcon(categoryInfo.id, category);
  const location = business.district || business.city || "Ordu";
  const profileUri = business.logoUrl;

  function openDetail() {
    lightImpact();
    router.push(`/business/${business.slug}` as never);
  }

  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: colors.surface,
        borderColor: colors.brandSoft,
        borderRadius: 20,
        borderWidth: 1,
        flexDirection: "row",
        gap: spacing.md,
        minHeight: 96,
        overflow: "hidden",
        padding: spacing.sm,
        ...shadows.soft
      }}
    >
      <Pressable
        accessibilityRole="button"
        onPress={openDetail}
        style={({ pressed }) => ({
          alignItems: "center",
          flex: 1,
          flexDirection: "row",
          gap: spacing.md,
          minWidth: 0,
          opacity: pressed ? 0.94 : 1
        })}
      >
      <View
        style={{
          alignItems: "center",
          backgroundColor: colors.brandSoft,
          borderColor: colors.brandHero,
          borderRadius: radii.xl,
          borderWidth: 2,
          height: 68,
          justifyContent: "center",
          overflow: "hidden",
          width: 68
        }}
      >
        {profileUri ? (
          <Image cachePolicy="memory-disk" source={{ uri: profileUri }} style={{ height: "100%", width: "100%" }} contentFit="cover" recyclingKey={`${business.id}:logo`} transition={0} />
        ) : (
          <CategoryFallbackIcon name={categoryIcon} />
        )}
      </View>

      <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          style={{
            ...typography.cardTitle,
            color: colors.ink,
            fontSize: 17,
            lineHeight: 21
          }}
        >
          {business.name}
        </Text>
        <Text numberOfLines={1} style={{ ...typography.small, color: colors.muted }}>
          {category}
          {location ? ` · ${location}` : ""}
        </Text>
      </View>
      </Pressable>

      {onFavoritePress ? (
        <FavoriteButton
          business={business}
          favorite={favorite}
          onFavoritePress={onFavoritePress}
        />
      ) : null}
    </View>
  );
}

function CategoryFallbackIcon({ name }: { name: string }) {
  return (
    <View
      style={{
        alignItems: "center",
        flex: 1,
        justifyContent: "center",
        width: "100%"
      }}
    >
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={{
          color: colors.brand,
          fontFamily: "MaterialSymbols_300Light",
          fontSize: 33,
          lineHeight: 33,
          textAlign: "center"
        }}
      >
        {name}
      </Text>
    </View>
  );
}

function HorizontalBusinessCard({
  business,
  favorite = false,
  onFavoritePress
}: BusinessCardProps) {
  const router = useRouter();
  const location = [business.district, business.city].filter(Boolean).join(", ");
  const distance = formatDistance(business.distance);
  const rating = business.rating ? formatRating(business.rating, business.reviewCount) : null;
  const category = resolveBusinessCategory(
    business.category,
    business.categoryLabel,
    business.industryId
  ).label;
  const imageUri = business.coverImage ?? business.logoUrl;
  const logoUri = business.logoUrl;

  function openDetail() {
    lightImpact();
    router.push(`/business/${business.slug}` as never);
  }

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.brandSoft,
        borderRadius: radii.xl,
        borderWidth: 1,
        overflow: "hidden",
        position: "relative",
        width: 260,
        ...shadows.soft
      }}
    >
      <Pressable
        accessibilityRole="button"
        onPress={openDetail}
        style={({ pressed }) => ({
          opacity: pressed ? 0.94 : 1
        })}
      >
        <View style={{ height: 140, position: "relative" }}>
        {imageUri ? (
          <Image cachePolicy="memory-disk" source={{ uri: imageUri }} style={{ height: "100%", width: "100%" }} contentFit="cover" recyclingKey={`${business.id}:horizontal`} transition={0} />
        ) : (
          <View style={{ alignItems: "center", backgroundColor: colors.brandSoft, flex: 1, justifyContent: "center" }}>
            <Icon name="store" color={colors.brandDeep} size={36} />
          </View>
        )}
        {rating ? (
          <View style={[styles.ratingBadge, { left: spacing.sm, top: spacing.sm }]}>
            <Icon name="star" color={colors.brandSoft} size={12} strokeWidth={2.5} />
            <Text style={{ ...typography.small, color: colors.inverseText }}>{rating}</Text>
          </View>
        ) : null}
        <BusinessLogoMark uri={logoUri} recyclingKey={`${business.id}:horizontal-logo`} size={42} style={{ bottom: spacing.sm, right: spacing.sm }} />
        </View>
        <View style={{ gap: 4, padding: spacing.md }}>
        <Text numberOfLines={1} style={{ ...typography.cardTitle, color: colors.ink }}>{business.name}</Text>
        <Text numberOfLines={1} style={{ ...typography.small, color: colors.muted }}>
          {category}
          {location ? ` · ${location}` : ""}
        </Text>
        <View style={{ alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
          {distance ? <StatusChip icon="mapPin" label={distance} tone="neutral" /> : null}
          <StatusChip icon="qr" label="QR profil" tone="brand" />
        </View>
        </View>
      </Pressable>
      {onFavoritePress ? (
        <View style={{ position: "absolute", right: spacing.sm, top: spacing.sm }}>
          <FavoriteButton business={business} favorite={favorite} onFavoritePress={onFavoritePress} />
        </View>
      ) : null}
    </View>
  );
}

function BusinessLogoMark({
  uri,
  recyclingKey,
  size,
  style,
  verified = false
}: {
  uri: string | null;
  recyclingKey: string;
  size: number;
  style: ViewStyle;
  verified?: boolean;
}) {
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: colors.surface,
        borderColor: colors.surface,
        borderRadius: radii.pill,
        borderWidth: 4,
        height: size,
        justifyContent: "center",
        overflow: "visible",
        position: "relative",
        width: size,
        ...style,
        ...shadows.lifted
      }}
    >
      <View style={{ borderRadius: radii.pill, height: "100%", overflow: "hidden", width: "100%" }}>
        {uri ? (
          <Image cachePolicy="memory-disk" source={{ uri }} style={{ height: "100%", width: "100%" }} contentFit="cover" recyclingKey={recyclingKey} transition={0} />
        ) : (
          <View style={{ alignItems: "center", backgroundColor: colors.brandSoft, flex: 1, justifyContent: "center" }}>
            <Icon name="store" color={colors.brandDeep} size={Math.round(size * 0.36)} />
          </View>
        )}
      </View>
      {verified ? (
        <View style={{ bottom: 2, position: "absolute", right: 0 }}>
          <Icon name="verified" color={colors.blue} size={18} />
        </View>
      ) : null}
    </View>
  );
}

function FavoriteButton({
  business,
  favorite,
  onFavoritePress,
  large = false
}: {
  business: KesfetBusiness;
  favorite: boolean;
  onFavoritePress: (business: KesfetBusiness) => void;
  large?: boolean;
}) {
  const size = large ? 46 : 38;
  const { isDark } = useThemeMode();
  return (
    <Pressable
      accessibilityLabel={favorite ? "Favorilerden çıkar" : "Favorilere ekle"}
      accessibilityRole="button"
      onPress={(event) => {
        event.stopPropagation();
        lightImpact();
        onFavoritePress(business);
      }}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor: favorite ? colors.coralSoft : (isDark ? colors.surface : "rgba(255,255,255,0.95)"),
        borderColor: colors.brandSoft,
        borderRadius: radii.pill,
        borderWidth: 1,
        height: size,
        justifyContent: "center",
        opacity: pressed ? 0.9 : 1,
        width: size,
        ...shadows.soft
      })}
    >
      <Icon name={favorite ? "heartFill" : "heart"} color={favorite ? colors.coral : colors.inkSoft} size={large ? 20 : 17} />
    </Pressable>
  );
}

function StatusChip({
  icon,
  label,
  tone
}: {
  icon: "star" | "mapPin" | "qr";
  label: string;
  tone: "brand" | "neutral";
}) {
  const palette = tone === "brand"
    ? { bg: colors.brandSoft, fg: colors.brandDeep }
    : { bg: colors.backgroundAlt, fg: colors.mutedStrong };

  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: palette.bg,
        borderRadius: radii.pill,
        flexDirection: "row",
        gap: 5,
        paddingHorizontal: spacing.sm,
        paddingVertical: 6
      }}
    >
      <Icon name={icon} color={palette.fg} size={13} strokeWidth={2.4} />
      <Text numberOfLines={1} style={{ ...typography.small, color: palette.fg }}>
        {label}
      </Text>
    </View>
  );
}

const styles = {
  ratingBadge: {
    alignItems: "center" as const,
    backgroundColor: colors.brandBadge,
    borderRadius: radii.pill,
    flexDirection: "row" as const,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    position: "absolute" as const
  }
};

function formatRating(rating: number, reviewCount: number | null) {
  const value = rating.toFixed(1);
  if (!reviewCount) {
    return value;
  }
  return `${value} (${reviewCount})`;
}

function getBusinessCategoryIcon(categoryId: string, categoryLabel: string) {
  const normalizedId = normalizeBusinessCategoryKey(categoryId);
  const normalizedLabel = normalizeBusinessCategoryKey(categoryLabel);

  if (normalizedId.includes("fast_food") || normalizedLabel.includes("fast_food")) {
    return "lunch_dining";
  }
  if (normalizedId.includes("emlak") || normalizedLabel.includes("emlak")) {
    return "home";
  }
  if (normalizedId.includes("klinik") || normalizedLabel.includes("klinik") || normalizedLabel.includes("saglik")) {
    return "medical_services";
  }
  if (normalizedId.includes("arac") || normalizedLabel.includes("arac")) {
    return "directions_car";
  }
  if (normalizedId.includes("otel") || normalizedLabel.includes("otel") || normalizedLabel.includes("konaklama")) {
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

function normalizeBusinessCategoryKey(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/&/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
