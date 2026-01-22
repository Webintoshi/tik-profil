import { Metadata } from "next";
import ClientEmlakPage from "./ClientEmlakPage";

export const metadata: Metadata = {
    title: "Emlak Danışmanı Dijital Portföy & Kartvizit",
    description: "Tüm ilan portföyünüzü tek bir linkte toplayın. Müşterilerinize profesyonel dijital kartvizitinizi gönderin, emlak ofisinizi cebinizde taşıyın.",
    keywords: ["emlakçı dijital kartvizit", "emlak portföy sitesi", "gayrimenkul web sitesi", "emlak ilan yönetimi", "dijital emlak asistanı", "emlak sitesi kurma"],
    alternates: {
        canonical: '/emlak',
    },
};

export default function EmlakPage() {
    return <ClientEmlakPage />;
}
