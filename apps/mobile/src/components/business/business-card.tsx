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
      <Pressable
        style={({ pressed }) => ({
          opacity: pressed ? 0.92 : 1,
        })}
      >
        <View
          style={{
            borderRadius: tokens.radius.lg,
            borderCurve: "continuous",
            borderWidth: 1,
            borderColor: tokens.colors.border,
            backgroundColor: tokens.colors.surface,
            overflow: "hidden",
            boxShadow: tokens.shadow.soft,
          }}
        >
          <View
            style={{
              height: 118,
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
          <View
            style={{
              gap: 12,
              padding: tokens.spacing.lg,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  style={{
                    color: tokens.colors.text,
                    fontSize: 18,
                    fontWeight: "700",
                  }}
                >
                  {business.name}
                </Text>
                <Text
                  style={{
                    color: tokens.colors.textMuted,
                    fontSize: 14,
                  }}
                >
                  {business.tagline}
                </Text>
              </View>
              <ChevronRight color={tokens.colors.textSoft} size={18} />
            </View>

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <View
                style={{
                  borderRadius: tokens.radius.pill,
                  backgroundColor: tokens.colors.surfaceMuted,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <Text
                  style={{
                    color: tokens.colors.text,
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  {business.category.icon} {business.category.label}
                </Text>
              </View>
              {business.tags.slice(0, 2).map((tag) => (
                <View
                  key={tag}
                  style={{
                    borderRadius: tokens.radius.pill,
                    backgroundColor: "#EDF4FD",
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <Text
                    style={{
                      color: tokens.colors.primarySoft,
                      fontSize: 13,
                      fontWeight: "600",
                    }}
                  >
                    {tag}
                  </Text>
                </View>
              ))}
            </View>

            <View style={{ gap: 8 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <MapPin color={tokens.colors.textSoft} size={15} />
                <Text
                  selectable
                  style={{
                    color: tokens.colors.textMuted,
                    fontSize: 13,
                    flex: 1,
                  }}
                >
                  {business.district}, {business.city}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Clock3 color={tokens.colors.textSoft} size={15} />
                  <Text
                    style={{
                      color: business.isOpen
                        ? tokens.colors.success
                        : tokens.colors.textMuted,
                      fontSize: 13,
                      fontWeight: "600",
                    }}
                  >
                    {business.isOpen ? "Açık" : "Kapalı"}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Star color="#E3A008" fill="#E3A008" size={15} />
                  <Text
                    style={{
                      color: tokens.colors.textMuted,
                      fontSize: 13,
                    }}
                  >
                    {business.rating?.toFixed(1) ?? "-"} · {business.reviewCount ?? 0}
                  </Text>
                </View>
                <Text
                  style={{
                    color: tokens.colors.primary,
                    fontSize: 13,
                    fontWeight: "700",
                  }}
                >
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
