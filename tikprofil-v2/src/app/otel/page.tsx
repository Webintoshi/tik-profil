import { Metadata } from "next";
import ClientOtelPage from "./ClientOtelPage";

export const metadata: Metadata = {
    title: "Otel Dijital Asistan, Oda Servisi ve Dijital Rehber | Tık Profil",
    description: "7/24 dijital resepsiyon sistemi ile telefon trafiğini azaltın, oda servisi satışlarını artırın. Misafirleriniz tek tıkla tüm hizmetlere ulaşsın. Komisyonsuz otel yazılımı.",
    keywords: ["otel dijital asistan", "oda servisi yazılımı", "dijital resepsiyon", "otel qr menü", "misafir deneyimi", "otel yazılımı", "akıllı oda kartı", "wifi qr kod", "turist otel uygulaması"],
    openGraph: {
        title: "Otel Dijital Asistan, Oda Servisi ve Dijital Rehber | Tık Profil",
        description: "7/24 dijital resepsiyon sistemi ile telefon trafiğini azaltın, oda servisi satışlarını artırın.",
        url: 'https://tikprofil.com/otel',
        siteName: 'Tık Profil',
        locale: 'tr_TR',
        type: 'website',
        images: [
            {
                url: 'https://tikprofil.com/og-otel.jpg',
                width: 1200,
                height: 630,
                alt: 'Tık Profil - Otel Dijital Asistan'
            }
        ]
    },
    twitter: {
        card: "summary_large_image",
        title: "Otel Dijital Asistan, Oda Servisi ve Dijital Rehber | Tık Profil",
        description: "7/24 dijital resepsiyon sistemi ile telefon trafiğini azaltın, oda servisi satışlarını artırın.",
        images: ['https://tikprofil.com/og-otel.jpg']
    },
    alternates: {
        canonical: '/otel',
    },
};

export default function OtelPage() {
    return <ClientOtelPage />;
}
