import { LinearGradient } from "expo-linear-gradient";
import { Pressable, Text, View } from "react-native";

import type { PrimaryProfileAction } from "@/business/profile-actions";
import { Icon, type IconName } from "@/components/common/Icon";
import { colors, radii, shadows, spacing, typography } from "@/theme/tokens";
import { useThemeMode } from "@/theme/theme-store";

export function ProfileActionBar({
  compact,
  isExpanded,
  onCall,
  onLocation,
  onPrimaryPress,
  onWhatsapp,
  primaryAction
}: {
  compact: boolean;
  isExpanded: boolean;
  onCall: () => void;
  onLocation: () => void;
  onPrimaryPress: () => void;
  onWhatsapp: () => void;
  primaryAction: PrimaryProfileAction;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      {!compact ? (
        <View testID="business-profile-support-actions" style={{ flexDirection: "row", gap: spacing.sm }}>
          <SupportProfileActionCard icon="phone" label="Ara" onPress={onCall} />
          <SupportProfileActionCard icon="whatsapp" label="WhatsApp" onPress={onWhatsapp} />
          <SupportProfileActionCard icon="mapPin" label="Konum" onPress={onLocation} />
        </View>
      ) : null}
      <PrimaryProfileActionCard
        icon={primaryAction.icon}
        isExpanded={isExpanded}
        label={primaryAction.label}
        onPress={onPrimaryPress}
        showChevron={primaryAction.showChevron}
        subtitle={getPrimaryActionSubtitle(primaryAction)}
      />
    </View>
  );
}

function SupportProfileActionCard({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor: colors.surface,
        borderColor: colors.brandSoft,
        borderRadius: 20,
        borderWidth: 2,
        flex: 1,
        gap: 6,
        height: 72,
        justifyContent: "center",
        opacity: pressed ? 0.9 : 1,
        paddingHorizontal: spacing.xs,
        ...shadows.soft
      })}
    >
      <Icon name={icon} color={colors.brand} size={21} strokeWidth={2.5} />
      <Text numberOfLines={1} style={{ ...typography.label, color: colors.ink, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

function PrimaryProfileActionCard({
  icon,
  isExpanded,
  label,
  onPress,
  showChevron,
  subtitle
}: {
  icon: IconName;
  isExpanded: boolean;
  label: string;
  onPress: () => void;
  showChevron: boolean;
  subtitle: string;
}) {
  const { isDark } = useThemeMode();
  const gradientEnd = isDark ? colors.accent : "#FF4D83";
  const iconBubbleColor = isDark ? "rgba(7,18,15,0.14)" : "rgba(255,255,255,0.18)";
  const subtitleColor = isDark ? "rgba(23,41,24,0.72)" : "rgba(255,255,255,0.78)";

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      testID="business-profile-primary-action"
      style={({ pressed }) => ({ borderRadius: 24, opacity: pressed ? 0.9 : 1, overflow: "hidden", ...shadows.soft })}
    >
      <LinearGradient
        colors={[colors.brand, gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          alignItems: "center",
          borderRadius: 24,
          flexDirection: "row",
          gap: spacing.md,
          minHeight: 66,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm
        }}
      >
        <View style={{ alignItems: "center", backgroundColor: iconBubbleColor, borderRadius: radii.pill, height: 42, justifyContent: "center", width: 42 }}>
          <Icon name={icon} color={colors.onBrand} size={22} strokeWidth={2.6} />
        </View>
        <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ ...typography.button, color: colors.onBrand, fontSize: 15 }}>{label}</Text>
          <Text numberOfLines={1} style={{ ...typography.small, color: subtitleColor, fontWeight: "700" }}>{subtitle}</Text>
        </View>
        {showChevron ? <Icon name={isExpanded ? "chevronDown" : "chevron"} color={colors.onBrand} size={20} /> : null}
      </LinearGradient>
    </Pressable>
  );
}

function getPrimaryActionSubtitle(action: PrimaryProfileAction) {
  if (action.menuKind === "fastfood") return "Menüyü aç, sepete ekle";
  if (action.menuKind === "restaurant") return "Menü ve detayları görüntüle";
  if (action.panelKind === "ecommerce") return "Ürünleri incele, sipariş oluştur";
  if (action.label.includes("Randevu")) return "Uygun zaman için hızlı iletişim";
  if (action.label.includes("Rezervasyon")) return "Müsaitlik ve rezervasyon bilgisi";
  if (action.label.includes("Teklif")) return "Detayları ilet, teklif al";
  if (action.label.includes("Ürün")) return "Ürün bilgisi için hızlı iletişim";
  return "Profil işlemini başlat";
}
