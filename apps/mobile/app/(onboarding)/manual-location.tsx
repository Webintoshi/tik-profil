import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { MapPin, Navigation, Sparkles } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { createManualLocationSelection } from "@/location/location-onboarding";
import { cityOptions } from "@/mocks/locations";
import { useAppSession } from "@/providers/app-session-provider";
import { tokens } from "@/theme/tokens";

export default function ManualLocationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    setHasSeenIntro,
    setLocationOnboardingStatus,
    setSelectedLocation,
  } = useAppSession();
  const [selectedCitySlug, setSelectedCitySlug] = useState(cityOptions[0]?.slug ?? "");
  const selectedCity = useMemo(
    () => cityOptions.find((city) => city.slug === selectedCitySlug) ?? cityOptions[0],
    [selectedCitySlug],
  );
  const [selectedDistrictSlug, setSelectedDistrictSlug] = useState(
    selectedCity?.districts[0]?.slug ?? "",
  );

  useEffect(() => {
    setSelectedDistrictSlug(selectedCity?.districts[0]?.slug ?? "");
  }, [selectedCitySlug, selectedCity]);

  const selectedDistrict = useMemo(
    () =>
      selectedCity?.districts.find((district) => district.slug === selectedDistrictSlug) ??
      selectedCity?.districts[0],
    [selectedCity, selectedDistrictSlug],
  );

  const neighborhood = selectedDistrict?.neighborhoods[0] ?? "Merkez";

  const handleContinue = () => {
    if (!selectedCity || !selectedDistrict) {
      return;
    }

    setHasSeenIntro(true);
    setLocationOnboardingStatus("manual");
    setSelectedLocation(
      createManualLocationSelection({
        city: selectedCity.label,
        district: selectedDistrict.label,
        neighborhood,
      }),
    );
    router.replace("/(tabs)/kesfet");
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFDF7" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, tokens.spacing.lg) + tokens.spacing.md,
          paddingHorizontal: tokens.spacing.lg,
          paddingBottom: 150,
          gap: tokens.spacing.lg,
        }}
      >
        <LinearGradient
          colors={["#102033", "#183F6A"]}
          style={{
            minHeight: 188,
            borderRadius: 34,
            borderCurve: "continuous",
            overflow: "hidden",
            padding: tokens.spacing.xl,
            justifyContent: "space-between",
          }}
        >
          <View
            style={{
              position: "absolute",
              right: -26,
              top: -20,
              width: 150,
              height: 150,
              borderRadius: 75,
              backgroundColor: "rgba(246,164,0,0.22)",
            }}
          />
          <View
            style={{
              width: 58,
              height: 58,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#F6A400",
            }}
          >
            <Navigation color={tokens.colors.white} size={26} />
          </View>
          <View style={{ gap: 8 }}>
            <Text
              style={{
                color: tokens.colors.white,
                fontSize: 30,
                fontWeight: "900",
                lineHeight: 35,
              }}
            >
              Konumunu elle seç
            </Text>
            <Text
              style={{
                color: "rgba(255,255,255,0.78)",
                fontSize: 15,
                lineHeight: 22,
              }}
            >
              Yakınındaki işletmeleri gösterebilmemiz için şehir ve ilçe seçimiyle
              devam edebilirsin.
            </Text>
          </View>
        </LinearGradient>

        <View
          style={{
            borderRadius: tokens.radius.lg,
            borderCurve: "continuous",
            backgroundColor: tokens.colors.surface,
            borderWidth: 1,
            borderColor: tokens.colors.border,
            padding: tokens.spacing.lg,
            gap: tokens.spacing.md,
          }}
        >
          <Text style={{ color: tokens.colors.text, fontSize: 18, fontWeight: "900" }}>
            Şehir
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {cityOptions.map((city) => (
              <Chip
                key={city.slug}
                label={city.label}
                selected={city.slug === selectedCitySlug}
                onPress={() => setSelectedCitySlug(city.slug)}
              />
            ))}
          </View>
        </View>

        <View
          style={{
            borderRadius: tokens.radius.lg,
            borderCurve: "continuous",
            backgroundColor: tokens.colors.surface,
            borderWidth: 1,
            borderColor: tokens.colors.border,
            padding: tokens.spacing.lg,
            gap: tokens.spacing.md,
          }}
        >
          <Text style={{ color: tokens.colors.text, fontSize: 18, fontWeight: "900" }}>
            İlçe
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {selectedCity?.districts.map((district) => (
              <Chip
                key={district.slug}
                label={district.label}
                selected={district.slug === selectedDistrictSlug}
                onPress={() => setSelectedDistrictSlug(district.slug)}
              />
            ))}
          </View>
        </View>

        <View
          style={{
            borderRadius: tokens.radius.lg,
            borderCurve: "continuous",
            backgroundColor: "#FFF5D6",
            borderWidth: 1,
            borderColor: "#FFE2A1",
            padding: tokens.spacing.lg,
            gap: tokens.spacing.sm,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Sparkles color="#C77700" size={20} />
            <Text style={{ color: tokens.colors.text, fontSize: 16, fontWeight: "900" }}>
              Daha detaylı seçim yakında
            </Text>
          </View>
          <Text style={{ color: tokens.colors.textMuted, fontSize: 14, lineHeight: 20 }}>
            Konum seçimi yakında daha detaylı olacak. Şimdilik keşfetmeye devam
            edebilirsin.
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <MapPin color="#C77700" size={16} />
            <Text style={{ color: tokens.colors.text, fontSize: 14, fontWeight: "800" }}>
              {selectedDistrict?.label}, {selectedCity?.label}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          left: 0,
          paddingHorizontal: tokens.spacing.lg,
          paddingTop: tokens.spacing.md,
          paddingBottom: Math.max(insets.bottom, tokens.spacing.md),
          backgroundColor: "rgba(255,253,247,0.96)",
          borderTopWidth: 1,
          borderTopColor: "rgba(16,32,51,0.08)",
        }}
      >
        <Button onPress={handleContinue}>Bu konumla devam et</Button>
      </View>
    </View>
  );
}
