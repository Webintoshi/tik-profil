import { useDeferredValue, useState } from "react";
import { View } from "react-native";
import { FullAccessRequiredPanel } from "@/components/auth/customer-auth-panels";
import { BusinessCard } from "@/components/business/business-card";
import { AppScrollScreen } from "@/components/layout/app-scroll-screen";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { LoadingState } from "@/components/states/loading-state";
import { SearchField } from "@/components/ui/search-field";
import { SectionHeader } from "@/components/ui/section-header";
import { useBusinessSearch } from "@/hooks/use-business-search";
import { useAppSession } from "@/providers/app-session-provider";
import { useCustomerAuth } from "@/providers/customer-auth-provider";

export default function SearchScreen() {
  const { selectedLocation } = useAppSession();
  const { canAccessFullApp, isAuthenticated } = useCustomerAuth();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const search = useBusinessSearch(deferredQuery, selectedLocation);

  if (!canAccessFullApp) {
    return (
      <AppScrollScreen
        header={
          <SectionHeader
            title="Ara"
            subtitle="Arama için önce müşteri hesabı tamamlanmalı."
          />
        }
      >
        <FullAccessRequiredPanel isAuthenticated={isAuthenticated} />
      </AppScrollScreen>
    );
  }

  return (
    <AppScrollScreen
      header={
        <View style={{ gap: 16 }}>
          <SearchField
            onChangeText={setQuery}
            placeholder="İşletme, kategori veya mahalle ara"
            value={query}
          />
        </View>
      }
    >
      <SectionHeader
        title="Arama sonuçları"
        subtitle={selectedLocation?.label ?? "Konum filtresi henüz seçilmedi."}
      />
      {!deferredQuery ? (
        <EmptyState
          title="Aramaya başla"
          description="İşletme adı, kategori ya da mahalle arayarak listeyi doldur."
        />
      ) : null}
      {deferredQuery && search.isLoading ? <LoadingState label="Arama yapılıyor..." /> : null}
      {deferredQuery && search.isError ? (
        <ErrorState description={search.error ?? "Arama başarısız oldu."} />
      ) : null}
      {deferredQuery &&
      search.isSuccess &&
      search.data.businesses.length === 0 ? (
        <EmptyState
          title="Sonuç bulunamadı"
          description="Başka bir kelime ya da farklı ilçe deneyebilirsin."
        />
      ) : null}
      {deferredQuery &&
      search.isSuccess &&
      search.data.businesses.length > 0
        ? search.data.businesses.map((business) => (
            <BusinessCard business={business} key={business.id} />
          ))
        : null}
    </AppScrollScreen>
  );
}
