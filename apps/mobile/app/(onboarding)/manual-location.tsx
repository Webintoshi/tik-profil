import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { AppScrollScreen } from "@/components/layout/app-scroll-screen";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { SectionHeader } from "@/components/ui/section-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { cityOptions } from "@/mocks/locations";
import { useAppSession } from "@/providers/app-session-provider";
import { tokens } from "@/theme/tokens";

export default function ManualLocationScreen() {
  const router = useRouter();
  const { setHasSeenIntro, setSelectedLocation } = useAppSession();
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

  const neighborhoodPlaceholder = selectedDistrict?.neighborhoods[0] ?? "Mahalle yakında";

  return (
    <AppScrollScreen
      header={
        <SectionHeader
          title="Konumu elle belirle"
          subtitle="Yakındaki işletmeleri gösterebilmemiz için şehir ve ilçeni seç."
        />
      }
    >
      <SurfaceCard>
        <SectionHeader title="Şehir" />
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
      </SurfaceCard>
      <SurfaceCard>
        <SectionHeader title="İlçe" />
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
      </SurfaceCard>
      <SurfaceCard>
        <SectionHeader
          title="Seçilen bölge"
          subtitle="Mahalle seçimi yakında daha detaylı hale gelecek."
        />
        <View
          style={{
            borderRadius: tokens.radius.md,
            backgroundColor: tokens.colors.surfaceMuted,
            padding: tokens.spacing.md,
          }}
        >
          <Text style={{ color: tokens.colors.text, fontSize: 15, fontWeight: "700" }}>
            {neighborhoodPlaceholder}
          </Text>
          <Text style={{ color: tokens.colors.textMuted, fontSize: 13, marginTop: 6 }}>
            Şimdilik bu bölgeyle keşfetmeye devam edebilirsin.
          </Text>
        </View>
      </SurfaceCard>
      <Button
        onPress={() => {
          if (!selectedCity || !selectedDistrict) {
            return;
          }

          setHasSeenIntro(true);
          setSelectedLocation({
            source: "manual",
            city: selectedCity.label,
            district: selectedDistrict.label,
            neighborhood: neighborhoodPlaceholder,
            label: `${selectedDistrict.label}, ${selectedCity.label}`,
          });
          router.replace("/(tabs)/kesfet");
        }}
      >
        Bu konumla devam et
      </Button>
    </AppScrollScreen>
  );
}
