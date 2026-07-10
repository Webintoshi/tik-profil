import type { IconName } from "@/components/common/Icon";

export interface OrduGuide {
  id: string;
  title: string;
  subtitle: string;
  icon: IconName;
  count: number;
}

export const PILOT_CITY = "Ordu";
export const PILOT_DISTRICT = "Altınordu";

export const orduGuides: OrduGuide[] = [
  {
    id: "ordu-food-guide",
    title: "Yeme İçme",
    subtitle: "Sahil, pide, balık",
    icon: "store",
    count: 18
  },
  {
    id: "ordu-coffee-guide",
    title: "Kafe",
    subtitle: "Boztepe ve sahil",
    icon: "spark",
    count: 12
  },
  {
    id: "ordu-service-guide",
    title: "Hizmetler",
    subtitle: "Randevu ve QR",
    icon: "qr",
    count: 9
  }
];
