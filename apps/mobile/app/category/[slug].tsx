import { Stack, useLocalSearchParams } from "expo-router";
import { AppScrollScreen } from "@/components/layout/app-scroll-screen";
import { BusinessCard } from "@/components/business/business-card";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { LoadingState } from "@/components/states/loading-state";
import { SectionHeader } from "@/components/ui/section-header";
import { useCategories } from "@/hooks/use-categories";
import { useDiscoveryFeed } from "@/hooks/use-discovery-feed";
import { useAppSession } from "@/providers/app-session-provider";

export default function CategoryResultsScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { selectedLocation } = useAppSession();
  const categories = useCategories();
  const category = categories.data.find((item) => item.slug === slug);
  const discovery = useDiscoveryFeed(selectedLocation, slug);

  return (
    <AppScrollScreen
      header={
        <>
          <Stack.Screen
            options={{
              title: category?.label ?? "Kategori",
            }}
          />
          <SectionHeader
            title={category ? `${category.icon} ${category.label}` : "Kategori"}
            subtitle={`${selectedLocation?.label ?? "Konum seçilmedi"} için kategori sonucu.`}
          />
        </>
      }
    >
      {discovery.isLoading ? <LoadingState label="Kategori yükleniyor..." /> : null}
      {discovery.isError ? (
        <ErrorState description={discovery.error ?? "Kategori sonucu getirilemedi."} />
      ) : null}
      {discovery.isSuccess && discovery.data.businesses.length === 0 ? (
        <EmptyState
          title="Bu kategoride sonuç yok"
          description="Farklı bir ilçe ya da farklı bir kategori deneyebilirsin."
        />
      ) : null}
      {discovery.isSuccess
        ? discovery.data.businesses.map((business) => (
            <BusinessCard business={business} key={business.id} />
          ))
        : null}
    </AppScrollScreen>
  );
}
