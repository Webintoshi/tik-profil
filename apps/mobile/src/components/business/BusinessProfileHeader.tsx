import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, Text, View } from "react-native";

import type { PublicProfileSocialLinks } from "@/api/kesfet";
import { resolveTikProfilAssetUrl } from "@/api/kesfet";
import { Icon, type IconName } from "@/components/common/Icon";
import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";
import { useThemeMode } from "@/theme/theme-store";

export interface BusinessProfileDisplay {
  id: string;
  slug: string;
  name: string;
  logo: string | null;
  cover: string | null;
  industry: string;
  industryLabel: string;
  isVerified: boolean;
  phone: string | null;
  whatsapp: string | null;
  about: string | null;
  address: string | null;
  mapsUrl: string | null;
  modules: string[];
  hasRestaurantModule: boolean;
  cartEnabled: boolean;
  social: PublicProfileSocialLinks;
}

export function BusinessProfileHeader({
  compact,
  isFavorite,
  onBack,
  onToggleFavorite,
  profile,
  topInset
}: {
  compact: boolean;
  isFavorite: boolean;
  onBack: () => void;
  onToggleFavorite?: () => void;
  profile: BusinessProfileDisplay;
  topInset: number;
}) {
  const coverUri = resolveTikProfilAssetUrl(profile.cover);
  const logoUri = resolveTikProfilAssetUrl(profile.logo);

  if (compact) {
    return (
      <View
        testID="business-profile-compact-identity"
        style={{
          alignItems: "center",
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
          flexDirection: "row",
          gap: spacing.sm,
          minHeight: topInset + 68,
          paddingBottom: spacing.sm,
          paddingHorizontal: spacing.screen,
          paddingTop: topInset + spacing.xs
        }}
      >
        <TopIconButton accessibilityLabel="Geri dön" icon="arrowLeft" onPress={onBack} />
        <ProfileLogo logoUri={logoUri} name={profile.name} size={48} />
        <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
          <View style={{ alignItems: "center", flexDirection: "row", gap: 5 }}>
            <Text numberOfLines={1} style={{ ...typography.label, color: colors.ink, flexShrink: 1, fontSize: 15 }}>
              {profile.name}
            </Text>
            {profile.isVerified ? <Icon name="verified" color={colors.brand} size={17} /> : null}
          </View>
          <Text numberOfLines={1} style={{ ...typography.small, color: colors.mutedStrong }}>
            {profile.industryLabel}
          </Text>
        </View>
        {onToggleFavorite ? (
          <TopIconButton
            accessibilityLabel={isFavorite ? "Favorilerden çıkar" : "Favorilere ekle"}
            icon={isFavorite ? "heartFill" : "heart"}
            iconColor={isFavorite ? colors.coral : colors.ink}
            onPress={onToggleFavorite}
          />
        ) : null}
      </View>
    );
  }

  return (
    <>
      <View testID="business-profile-cover" style={{ height: 150 + topInset, position: "relative" }}>
        {coverUri ? (
          <Image cachePolicy="memory-disk" source={{ uri: coverUri }} style={{ height: "100%", width: "100%" }} contentFit="cover" transition={180} />
        ) : (
          <LinearGradient colors={[...colors.heroGradient]} style={{ flex: 1 }} />
        )}
        <View style={{ left: spacing.md, position: "absolute", top: topInset + spacing.xs }}>
          <TopIconButton accessibilityLabel="Geri dön" icon="arrowLeft" onPress={onBack} />
        </View>
        {onToggleFavorite ? (
          <View style={{ position: "absolute", right: spacing.md, top: topInset + spacing.xs }}>
            <TopIconButton
              accessibilityLabel={isFavorite ? "Favorilerden çıkar" : "Favorilere ekle"}
              icon={isFavorite ? "heartFill" : "heart"}
              iconColor={isFavorite ? colors.coral : colors.ink}
              onPress={onToggleFavorite}
            />
          </View>
        ) : null}
      </View>

      <View style={{ alignItems: "flex-start", flexDirection: "row", gap: spacing.md, marginTop: -26, paddingHorizontal: spacing.screen }}>
        <ProfileLogo logoUri={logoUri} name={profile.name} size={96} />
        <View style={{ flex: 1, gap: 5, paddingTop: spacing.xxl }}>
          <View style={{ alignItems: "center", flexDirection: "row", gap: 6 }}>
            <Text numberOfLines={2} style={{ ...typography.title, color: colors.ink, flexShrink: 1, fontSize: 16, lineHeight: 20 }}>
              {profile.name}
            </Text>
            {profile.isVerified ? <Icon name="verified" color={colors.brand} size={19} /> : null}
          </View>
          <View
            style={{
              alignSelf: "flex-start",
              backgroundColor: colors.brandSoft,
              borderRadius: radii.pill,
              paddingHorizontal: 7,
              paddingVertical: 2
            }}
          >
            <Text numberOfLines={1} style={{ ...typography.tab, color: colors.brandDeep, fontSize: 10, lineHeight: 12, textTransform: "uppercase" }}>
              {profile.industryLabel}
            </Text>
          </View>
          {profile.about ? (
            <Text numberOfLines={2} style={{ ...typography.body, color: colors.inkSoft, fontSize: 13, fontWeight: "700", lineHeight: 18 }}>
              {trimDescription(profile.about)}
            </Text>
          ) : null}
        </View>
      </View>
    </>
  );
}

function ProfileLogo({ logoUri, name, size }: { logoUri: string | null; name: string; size: number }) {
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: colors.surface,
        borderColor: colors.brandSoft,
        borderRadius: radii.pill,
        borderWidth: size >= 90 ? 5 : 2,
        height: size,
        justifyContent: "center",
        overflow: "hidden",
        width: size,
        ...shadows.soft
      }}
    >
      {logoUri ? (
        <Image cachePolicy="memory-disk" source={{ uri: logoUri }} style={{ height: "100%", width: "100%" }} contentFit="cover" transition={180} />
      ) : (
        <Text style={{ ...typography.title, color: colors.ink, fontSize: size >= 90 ? 20 : 14 }}>{getInitials(name)}</Text>
      )}
    </View>
  );
}

function TopIconButton({
  accessibilityLabel,
  icon,
  iconColor = colors.ink,
  onPress
}: {
  accessibilityLabel: string;
  icon: IconName;
  iconColor?: string;
  onPress: () => void;
}) {
  const { isDark } = useThemeMode();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor: isDark ? colors.surface : "rgba(255,255,255,0.94)",
        borderColor: isDark ? colors.border : "transparent",
        borderRadius: radii.pill,
        borderWidth: 1,
        height: 38,
        justifyContent: "center",
        opacity: pressed ? 0.88 : 1,
        width: 38,
        ...shadows.soft
      })}
    >
      <Icon name={icon} color={iconColor} size={19} />
    </Pressable>
  );
}

function trimDescription(value: string) {
  return value.length > 124 ? `${value.slice(0, 121).trim()}...` : value;
}

function getInitials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}
