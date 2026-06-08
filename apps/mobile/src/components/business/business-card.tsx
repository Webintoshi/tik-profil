import { Link } from "expo-router";
import { Image } from "expo-image";
import { ChevronRight, Clock3, MapPin, Star } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { tokens } from "@/theme/tokens";
import type { DiscoveryBusiness } from "@/types/business";
import { formatDistanceKm } from "@/utils/text";

interface BusinessCardProps {
  business: DiscoveryBusiness;
}

export function BusinessCard({ business }: BusinessCardProps) {
  return (
    <Link href={`/business/${business.slug}`} asChild>
      <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}>
        <View
          style={{
            minHeight: 148,
            borderRadius: tokens.radius.lg,
            borderCurve: "continuous",
            borderWidth: 1,
            borderColor: tokens.colors.border,
            backgroundColor: tokens.colors.surface,
            flexDirection: "row",
            overflow: "hidden",
            boxShadow: tokens.shadow.soft,
          }}
        >
          <View
            style={{
              width: 118,
              backgroundColor: tokens.colors.surfaceStrong,
            }}
          >
            {business.coverImageUrl ? (
              <Image
                contentFit="cover"
                source={business.coverImageUrl}
                style={{ flex: 1 }}
                transition={180}
              />
            ) : null}
          </View>
          <View style={{ flex: 1, gap: 10, padding: tokens.spacing.md }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text
                  numberOfLines={1}
                  style={{ color: tokens.colors.text, fontSize: 17, fontWeight: "800" }}
                >
                  {business.name}
                </Text>
                <Text
                  numberOfLines={2}
                  style={{ color: tokens.colors.textMuted, fontSize: 13, lineHeight: 18 }}
                >
                  {business.tagline}
                </Text>
              </View>
              <ChevronRight color={tokens.colors.textSoft} size={18} />
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              <View
                style={{
                  borderRadius: tokens.radius.pill,
                  backgroundColor: tokens.colors.surfaceMuted,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ color: tokens.colors.text, fontSize: 12, fontWeight: "700" }}>
                  {business.category.icon} {business.category.label}
                </Text>
              </View>
              {business.tags.slice(0, 1).map((tag) => (
                <View
                  key={tag}
                  style={{
                    borderRadius: tokens.radius.pill,
                    backgroundColor: "#EDF4FD",
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                  }}
                >
                  <Text
                    style={{
                      color: tokens.colors.primarySoft,
                      fontSize: 12,
                      fontWeight: "700",
                    }}
                  >
                    {tag}
                  </Text>
                </View>
              ))}
            </View>

            <View style={{ gap: 7 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <MapPin color={tokens.colors.textSoft} size={14} />
                <Text
                  selectable
                  numberOfLines={1}
                  style={{ color: tokens.colors.textMuted, fontSize: 12, flex: 1 }}
                >
                  {business.district}, {business.city}
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Clock3 color={tokens.colors.textSoft} size={14} />
                  <Text
                    style={{
                      color: business.isOpen ? tokens.colors.success : tokens.colors.textMuted,
                      fontSize: 12,
                      fontWeight: "700",
                    }}
                  >
                    {business.isOpen ? "Açık" : "Kapalı"}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Star color="#E3A008" fill="#E3A008" size={14} />
                  <Text style={{ color: tokens.colors.textMuted, fontSize: 12 }}>
                    {business.rating?.toFixed(1) ?? "-"} · {business.reviewCount ?? 0}
                  </Text>
                </View>
                <Text style={{ color: tokens.colors.primary, fontSize: 12, fontWeight: "800" }}>
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
