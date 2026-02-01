import { Metadata } from "next";
import ClientEmlakPage from "./ClientEmlakPage";

export const metadata: Metadata = {
    title: "Emlak Danışmanı Dijital Portföy ve Gayrimenkul Sitesi | Tık Profil",
    description: "Tüm emlak ilanlarınızı tek linkte toplayın. Profesyonel dijital kartvizitinizi oluşturun, müşterilerinize WhatsApp'tan paylaşın. Komisyonsuz emlak sitesi.",
    keywords: ["emlakçı dijital kartvizit", "emlak portföy sitesi", "gayrimenkul web sitesi", "emlak ilan yönetimi", "dijital emlak asistanı", "emlak sitesi kurma", "portföy sayfası", "gayrimenkul danışmanı kartviziti"],
    openGraph: {
        title: "Emlak Danışmanı Dijital Portföy ve Gayrimenkul Sitesi | Tık Profil",
        description: "Tüm emlak ilanlarınızı tek linkte toplayın. Profesyonel dijital kartvizitinizi oluşturun.",
        url: 'https://tikprofil.com/emlak',
        siteName: 'Tık Profil',
        locale: 'tr_TR',
        type: 'website',
        images: [
            {
                url: 'https://tikprofil.com/og-emlak.jpg',
                width: 1200,
                height: 630,
                alt: 'Tık Profil - Emlak Danışmanı Dijital Portföy'
            }
        ]
    },
    twitter: {
        card: "summary_large_image",
        title: "Emlak Danışmanı Dijital Portföy ve Gayrimenkul Sitesi | Tık Profil",
        description: "Tüm emlak ilanlarınızı tek linkte toplayın. Profesyonel dijital kartvizitinizi oluşturun.",
        images: ['https://tikprofil.com/og-emlak.jpg']
    },
    alternates: {
        canonical: '/emlak',
    },
};

export default function EmlakPage() {
    return <ClientEmlakPage />;
}
