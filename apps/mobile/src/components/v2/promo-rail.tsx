import { LinearGradient } from "expo-linear-gradient";
import { ScrollView, Text, View } from "react-native";
import { tokens } from "@/theme/tokens";

interface PromoItem {
  accent: string;
  body: string;
  title: string;
}

const defaultPromos: PromoItem[] = [
  {
    accent: "Bugün",
    body: "Yakınındaki işletmelerden yeni kampanyalar ve QR profiller.",
    title: "Mahallende neler var?",
  },
  {
    accent: "Yakında",
    body: "Favoriler, cüzdan ve sipariş geçmişi güvenli şekilde açılacak.",
    title: "Hesabını hazır tut",
  },
  {
    accent: "QR",
    body: "Masada, vitrinde veya sosyal medyada tek profil bağlantısı.",
    title: "Tıkla, profili aç",
  },
];

export function PromoRail({
  items = defaultPromos,
}: {
  items?: PromoItem[];
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: tokens.spacing.sm, paddingRight: tokens.spacing.lg }}
    >
      {items.map((item, index) => (
        <LinearGradient
          colors={index % 2 === 0 ? tokens.gradients.hero : tokens.gradients.sunset}
          key={item.title}
          style={{
            width: 238,
            minHeight: 132,
            borderRadius: tokens.radius.xl,
            borderCurve: "continuous",
            overflow: "hidden",
            padding: tokens.spacing.lg,
            justifyContent: "space-between",
            boxShadow: tokens.shadow.strong,
          }}
        >
          <View
            style={{
              alignSelf: "flex-start",
              borderRadius: tokens.radius.pill,
              backgroundColor: "rgba(255,255,255,0.18)",
              paddingHorizontal: 10,
              paddingVertical: 6,
            }}
          >
            <Text style={{ color: tokens.colors.white, fontSize: 12, fontWeight: "900" }}>
              {item.accent}
            </Text>
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ color: tokens.colors.white, fontSize: 20, fontWeight: "900" }}>
              {item.title}
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.78)", fontSize: 13, lineHeight: 18 }}>
              {item.body}
            </Text>
          </View>
        </LinearGradient>
      ))}
    </ScrollView>
  );
}

