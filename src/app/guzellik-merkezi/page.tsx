import { Metadata } from "next";
import ClientGuzellikPage from "./ClientGuzellikPage";

export const metadata: Metadata = {
    title: "Kuaför Randevu Sistemi ve Güzellik Merkezi Yazılımı | Tık Profil",
    description: "Telefon trafiğinden kurtulun! Müşterileriniz 7/24 online randevu alsın, sistem otomatik SMS/WhatsApp hatırlatma yapsın. Randevu kaçaklarını %90 azaltın.",
    keywords: ["kuaför randevu sistemi", "güzellik merkezi yazılımı", "berber randevu programı", "online randevu", "dijital kuaför", "randevu takip programı", "randevu hatırlatma", "tıkla randevu", "salon yazılımı"],
    openGraph: {
        title: "Kuaför Randevu Sistemi ve Güzellik Merkezi Yazılımı | Tık Profil",
        description: "Telefon trafiğinden kurtulun! Müşterileriniz 7/24 online randevu alsın.",
        url: 'https://tikprofil.com/guzellik-merkezi',
        siteName: 'Tık Profil',
        locale: 'tr_TR',
        type: 'website',
        images: [
            {
                url: 'https://tikprofil.com/og-guzellik.jpg',
                width: 1200,
                height: 630,
                alt: 'Tık Profil - Kuaför Randevu Sistemi'
            }
        ]
    },
    twitter: {
        card: "summary_large_image",
        title: "Kuaför Randevu Sistemi ve Güzellik Merkezi Yazılımı | Tık Profil",
        description: "Telefon trafiğinden kurtulun! Müşterileriniz 7/24 online randevu alsın.",
        images: ['https://tikprofil.com/og-guzellik.jpg']
    },
    alternates: {
        canonical: '/guzellik-merkezi',
    },
};

export default function GuzellikPage() {
    return <ClientGuzellikPage />;
}
