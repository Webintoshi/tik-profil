import { useEffect, useState } from "react";
import { getDiscoveryApi } from "@/api";
import { AppScrollScreen } from "@/components/layout/app-scroll-screen";
import { BusinessCard } from "@/components/business/business-card";
import { EmptyState } from "@/components/states/empty-state";
import { LoadingState } from "@/components/states/loading-state";
import { SectionHeader } from "@/components/ui/section-header";
import { useAppSession } from "@/providers/app-session-provider";
import type { DiscoveryBusiness } from "@/types/business";

export default function FavoritesScreen() {
  const { favoriteSlugs } = useAppSession();
  const [items, setItems] = useState<DiscoveryBusiness[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;

    if (favoriteSlugs.length === 0) {
      setItems([]);
      return () => {
        active = false;
      };
    }

    setIsLoading(true);
    Promise.all(favoriteSlugs.map((slug) => getDiscoveryApi().getBusinessBySlug(slug)))
      .then((businesses) => {
        if (!active) {
          return;
        }

        setItems(
          businesses
            .filter((business): business is NonNullable<typeof business> => Boolean(business))
            .map((business) => ({
              id: business.id,
              slug: business.slug,
              name: business.name,
              tagline: business.tagline,
              category: business.category,
              city: business.city,
              district: business.district,
              neighborhood: business.neighborhood,
              address: business.address,
              distanceKm: business.distanceKm,
              rating: business.rating,
              reviewCount: business.reviewCount,
              isOpen: business.isOpen,
              coverImageUrl: business.coverImageUrl,
              logoImageUrl: business.logoImageUrl,
              tags: business.tags,
            })),
        );
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [favoriteSlugs]);

  return (
    <AppScrollScreen
      header={
        <SectionHeader
          title="Favoriler"
          subtitle="Bu liste cihaz üzerinde tutulur. Auth ve stateful müşteri favorileri daha sonra bağlanacak."
        />
      }
    >
      {isLoading ? <LoadingState label="Favoriler yükleniyor..." /> : null}
      {!isLoading && items.length === 0 ? (
        <EmptyState
          title="Henüz favori yok"
          description="İşletme detayındaki kalp aksiyonunu kullanarak bu placeholder alanını doldurabilirsin."
        />
      ) : null}
      {!isLoading
        ? items.map((business) => <BusinessCard business={business} key={business.id} />)
        : null}
    </AppScrollScreen>
  );
}
