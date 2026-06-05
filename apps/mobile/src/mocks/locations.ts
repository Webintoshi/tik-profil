import type { CityOption } from "@/types/location";

export const cityOptions: CityOption[] = [
  {
    slug: "istanbul",
    label: "İstanbul",
    districts: [
      {
        slug: "kadikoy",
        label: "Kadıköy",
        neighborhoods: ["Moda", "Caferağa", "Fenerbahçe"],
      },
      {
        slug: "besiktas",
        label: "Beşiktaş",
        neighborhoods: ["Levent", "Etiler", "Abbasağa"],
      },
    ],
  },
  {
    slug: "ankara",
    label: "Ankara",
    districts: [
      {
        slug: "cankaya",
        label: "Çankaya",
        neighborhoods: ["Kızılay", "Ayrancı", "Yıldız"],
      },
      {
        slug: "yenimahalle",
        label: "Yenimahalle",
        neighborhoods: ["Batıkent", "Demetevler", "Macunköy"],
      },
    ],
  },
  {
    slug: "izmir",
    label: "İzmir",
    districts: [
      {
        slug: "konak",
        label: "Konak",
        neighborhoods: ["Alsancak", "Güzelyalı", "Mithatpaşa"],
      },
      {
        slug: "bornova",
        label: "Bornova",
        neighborhoods: ["Kazımdirik", "Ergene", "Atatürk"],
      },
    ],
  },
];
