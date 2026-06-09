import { Link } from "expo-router";
import { Image } from "expo-image";
import { Clock3, MapPin, Star } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { tokens } from "@/theme/tokens";
import type { DiscoveryBusiness } from "@/types/business";
import { formatDistanceKm } from "@/utils/text";

interface BusinessShowcaseCardProps {
  business: DiscoveryBusiness;
}

export function BusinessShowcaseCard({
  business,
}: BusinessShowcaseCardProps) {
  return (
    <Link href={`/business/${business.slug}`} asChild>
      <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}>
        <View
          style={{
            borderRadius: tokens.radius.xl,
            borderCurve: "continuous",
            backgroundColor: tokens.colors.surface,
            overflow: "hidden",
            boxShadow: tokens.shadow.strong,
          }}
        >
          <View style={{ height: 168, backgroundColor: tokens.colors.surfaceStrong }}>
            {business.coverImageUrl ? (
              <Image
                contentFit="cover"
                source={business.coverImageUrl}
                style={{ flex: 1 }}
                transition={220}
              />
            ) : null}
            <View
              style={{
                position: "absolute",
                left: tokens.spacing.md,
                right: tokens.spacing.md,
                bottom: tokens.spacing.md,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: tokens.spacing.sm,
              }}
            >
              <View
                style={{
                  borderRadius: tokens.radius.pill,
                  backgroundColor: business.isOpen
                    ? "rgba(7,135,103,0.94)"
                    : "rgba(7,24,45,0.82)",
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                }}
              >
                <Text style={{ color: tokens.colors.white, fontSize: 12, fontWeight: "900" }}>
                  {business.isOpen ? "Açık" : "Kapalı"}
                </Text>
              </View>
              <View
                style={{
                  borderRadius: tokens.radius.pill,
                  backgroundColor: "rgba(7,24,45,0.78)",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                }}
              >
                <Star color={tokens.colors.accentGold} fill={tokens.colors.accentGold} size={13} />
                <Text style={{ color: tokens.colors.white, fontSize: 12, fontWeight: "900" }}>
                  {business.rating?.toFixed(1) ?? "-"}
                </Text>
              </View>
            </View>
          </View>
          <View style={{ gap: 12, padding: tokens.spacing.lg }}>
            <View style={{ gap: 5 }}>
              <Text
                numberOfLines={1}
                style={{
                  color: tokens.colors.text,
                  fontSize: 22,
                  fontWeight: "900",
                  letterSpacing: -0.4,
                }}
              >
                {business.name}
              </Text>
              <Text
                numberOfLines={2}
                style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20 }}
              >
                {business.tagline}
              </Text>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <View
                style={{
                  borderRadius: tokens.radius.pill,
                  backgroundColor: tokens.colors.infoSoft,
                  paddingHorizontal: 11,
                  paddingVertical: 7,
                }}
              >
                <Text style={{ color: tokens.colors.primary, fontSize: 12, fontWeight: "900" }}>
                  {business.category.icon} {business.category.label}
                </Text>
              </View>
              {business.tags.slice(0, 2).map((tag) => (
                <View
                  key={tag}
                  style={{
                    borderRadius: tokens.radius.pill,
                    backgroundColor: tokens.colors.surfaceMuted,
                    paddingHorizontal: 11,
                    paddingVertical: 7,
                  }}
                >
                  <Text style={{ color: tokens.colors.textMuted, fontSize: 12, fontWeight: "800" }}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: tokens.spacing.md,
              }}
            >
              <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
                <MapPin color={tokens.colors.textSoft} size={15} />
                <Text
                  numberOfLines={1}
                  selectable
                  style={{ color: tokens.colors.textMuted, flex: 1, fontSize: 13 }}
                >
                  {business.district}, {business.city}
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Clock3 color={tokens.colors.primarySoft} size={15} />
                <Text style={{ color: tokens.colors.primary, fontSize: 13, fontWeight: "900" }}>
                  {formatDistanceKm(business.distanceKm)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

