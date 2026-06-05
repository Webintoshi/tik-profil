import { Stack, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import {
  Globe,
  Heart,
  MapPin,
  MessageCircle,
  Phone,
  QrCode,
  Share2,
  Star,
} from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { AppScrollScreen } from "@/components/layout/app-scroll-screen";
import { BrandMark } from "@/components/brand/brand-mark";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { LoadingState } from "@/components/states/loading-state";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { useBusinessDetail } from "@/hooks/use-business-detail";
import { useAppSession } from "@/providers/app-session-provider";
import { tokens } from "@/theme/tokens";
import { openExternalUrl, openPhone, openWhatsApp } from "@/utils/links";
import { formatDistanceKm } from "@/utils/text";

function SocialGlyph({ type }: { type: string }) {
  switch (type) {
    case "instagram":
      return <Share2 color={tokens.colors.primary} size={18} />;
    case "facebook":
      return <MessageCircle color={tokens.colors.primary} size={18} />;
    case "linkedin":
      return <Star color={tokens.colors.primary} size={18} />;
    case "x":
      return <Share2 color={tokens.colors.primary} size={18} />;
    case "website":
    default:
      return <Globe color={tokens.colors.primary} size={18} />;
  }
}

export default function BusinessDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const detail = useBusinessDetail(slug);
  const { favoriteSlugs, toggleFavorite } = useAppSession();

  if (detail.isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 20 }}>
        <LoadingState label="İşletme profili hazırlanıyor..." />
      </View>
    );
  }

  if (detail.isError) {
    return (
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 20 }}>
        <ErrorState description={detail.error ?? "İşletme profili açılamadı."} />
      </View>
    );
  }

  if (!detail.data) {
    return (
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 20 }}>
        <EmptyState
          title="İşletme bulunamadı"
          description="Bu slug için mock ya da public profil verisi bulunamadı."
        />
      </View>
    );
  }

  const business = detail.data;
  const isFavorite = favoriteSlugs.includes(business.slug);

  return (
    <AppScrollScreen
      header={
        <>
          <Stack.Screen
            options={{
              title: business.name,
              headerRight: () => (
                <Pressable
                  onPress={() => toggleFavorite(business.slug)}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isFavorite ? "#FFF0F0" : tokens.colors.surfaceMuted,
                  }}
                >
                  <Heart
                    color={isFavorite ? tokens.colors.danger : tokens.colors.textSoft}
                    fill={isFavorite ? tokens.colors.danger : "transparent"}
                    size={18}
                  />
                </Pressable>
              ),
            }}
          />
          <View
            style={{
              borderRadius: 28,
              overflow: "hidden",
              backgroundColor: tokens.colors.surfaceStrong,
            }}
          >
            <View style={{ height: 200 }}>
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
                position: "absolute",
                right: 16,
                top: 16,
                width: 64,
                height: 64,
                borderRadius: 22,
                borderCurve: "continuous",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(9, 28, 53, 0.72)",
              }}
            >
              <BrandMark size={34} />
            </View>
          </View>
          <SurfaceCard>
            <View style={{ gap: 12 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: tokens.colors.text, fontSize: 26, fontWeight: "800" }}>
                    {business.name}
                  </Text>
                  <Text style={{ color: tokens.colors.textMuted, fontSize: 15 }}>
                    {business.category.icon} {business.category.label}
                  </Text>
                </View>
                <Text style={{ color: tokens.colors.primary, fontSize: 14, fontWeight: "700" }}>
                  {formatDistanceKm(business.distanceKm)}
                </Text>
              </View>
              <Text style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20 }}>
                {business.description}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Star color="#E3A008" fill="#E3A008" size={16} />
                <Text style={{ color: tokens.colors.textMuted, fontSize: 14 }}>
                  {business.rating?.toFixed(1) ?? "-"} puan · {business.reviewCount ?? 0} yorum
                </Text>
              </View>
            </View>
          </SurfaceCard>
        </>
      }
    >
      <SurfaceCard>
        <SectionHeader title="Hızlı aksiyonlar" />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          <Button onPress={() => void openPhone(business.contact.phone)}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Phone color={tokens.colors.white} size={16} />
              <Text style={{ color: tokens.colors.white, fontSize: 15, fontWeight: "700" }}>
                Ara
              </Text>
            </View>
          </Button>
          <Button onPress={() => void openWhatsApp(business.contact.whatsapp)} variant="secondary">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <MessageCircle color={tokens.colors.text} size={16} />
              <Text style={{ color: tokens.colors.text, fontSize: 15, fontWeight: "700" }}>
                WhatsApp
              </Text>
            </View>
          </Button>
          <Button onPress={() => void openExternalUrl(business.contact.directionsUrl)} variant="secondary">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <MapPin color={tokens.colors.text} size={16} />
              <Text style={{ color: tokens.colors.text, fontSize: 15, fontWeight: "700" }}>
                Yol tarifi
              </Text>
            </View>
          </Button>
          <Button onPress={() => void openExternalUrl(business.websiteUrl)} variant="secondary">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Globe color={tokens.colors.text} size={16} />
              <Text style={{ color: tokens.colors.text, fontSize: 15, fontWeight: "700" }}>
                Web sitesi
              </Text>
            </View>
          </Button>
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Adres" />
        <Text selectable style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 22 }}>
          {business.contact.address}
        </Text>
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Sosyal bağlantılar" />
        <View style={{ gap: 10 }}>
          {business.socialLinks.map((link) => (
            <Pressable
              key={link.id}
              onPress={() => void openExternalUrl(link.url)}
              style={{
                borderRadius: 16,
                borderCurve: "continuous",
                borderWidth: 1,
                borderColor: tokens.colors.border,
                backgroundColor: tokens.colors.surfaceMuted,
                padding: 14,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <SocialGlyph type={link.type} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: tokens.colors.text, fontSize: 15, fontWeight: "700" }}>
                    {link.label}
                  </Text>
                  <Text selectable style={{ color: tokens.colors.textMuted, fontSize: 13 }}>
                    {link.url}
                  </Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Çalışma saatleri" />
        <View style={{ gap: 10 }}>
          {business.workingHours.map((item) => (
            <View
              key={item.day}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <Text
                style={{
                  color: item.isToday ? tokens.colors.primary : tokens.colors.text,
                  fontSize: 14,
                  fontWeight: item.isToday ? "700" : "600",
                }}
              >
                {item.day}
              </Text>
              <Text
                selectable
                style={{
                  color: tokens.colors.textMuted,
                  fontSize: 14,
                }}
              >
                {item.hours}
              </Text>
            </View>
          ))}
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader
          title="QR / profil alanı"
          subtitle="Gerçek QR üretimi daha sonra bağlanacak. Bu alan profil URL ve paylaşım aksiyonunu sabitler."
        />
        <View style={{ flexDirection: "row", gap: 16 }}>
          <View
            style={{
              width: 92,
              height: 92,
              borderRadius: 24,
              borderCurve: "continuous",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#EDF4FD",
            }}
          >
            <QrCode color={tokens.colors.primary} size={40} />
          </View>
          <View style={{ flex: 1, gap: 12 }}>
            <Text selectable style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20 }}>
              {business.qrProfileUrl}
            </Text>
            <Button onPress={() => void openExternalUrl(business.qrProfileUrl)} variant="secondary">
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Share2 color={tokens.colors.text} size={16} />
                <Text style={{ color: tokens.colors.text, fontSize: 15, fontWeight: "700" }}>
                  Profili aç
                </Text>
              </View>
            </Button>
          </View>
        </View>
      </SurfaceCard>
    </AppScrollScreen>
  );
}
