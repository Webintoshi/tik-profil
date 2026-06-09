import { BusinessShowcaseCard } from "@/components/v2/business-showcase-card";
import type { DiscoveryBusiness } from "@/types/business";

interface BusinessCardProps {
  business: DiscoveryBusiness;
}

export function BusinessCard({ business }: BusinessCardProps) {
  return <BusinessShowcaseCard business={business} />;
}
