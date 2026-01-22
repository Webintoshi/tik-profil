import { Metadata } from "next";
import ClientGuzellikPage from "./ClientGuzellikPage";

export const metadata: Metadata = {
    title: "Güzellik Merkezi & Kuaför Randevu Sistemi",
    description: "Telefon trafiğinden kurtulun! Müşterileriniz 7/24 online randevu alsın, sistem otomatik hatırlatma yapsın. Randevu kaçaklarını %90 azaltın.",
    keywords: ["kuaför randevu sistemi", "güzellik merkezi yazılımı", "berber randevu programı", "online randevu", "dijital kuaför", "randevu takip programı"],
    alternates: {
        canonical: '/guzellik-merkezi',
    },
};

export default function GuzellikPage() {
    return <ClientGuzellikPage />;
}
