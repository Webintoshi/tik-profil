import { LandingPage } from "@/components/landing/LandingPage";
import { Metadata } from "next";
import Script from 'next/script';
import { organizationSchema } from "@/lib/schema/organizationSchema";
import { webSiteSchema } from "@/lib/schema/webSiteSchema";
import { generateFAQSchema } from "@/lib/schema/faqSchema";

export const metadata: Metadata = {
    title: "Dijital Kartvizit, QR Menü ve Randevu Sistemi | Tık Profil",
    description: "İşletmeniz için ücretsiz dijital kartvizit, QR menü ve online randevu sistemi. 60 saniyede kurulum, komisyonsuz. Restoran, kuaför, emlak ve tüm işletmeler için.",
    keywords: ["dijital kartvizit", "qr menü", "online randevu sistemi", "bio link", "işletme dijitalleşme", "restoran qr kod", "kuaför randevu sistemi", "emlak portföy sitesi", "e-ticaret linki", "temassız menü", "dijital profil"],
    openGraph: {
        title: "Dijital Kartvizit, QR Menü ve Randevu Sistemi | Tık Profil",
        description: "İşletmeniz için ücretsiz dijital kartvizit, QR menü ve online randevu sistemi. 60 saniyede kurulum, komisyonsuz.",
        url: 'https://tikprofil.com',
        siteName: 'Tık Profil',
        locale: 'tr_TR',
        type: 'website',
        images: [
            {
                url: 'https://tikprofil.com/og-image.jpg',
                width: 1200,
                height: 630,
                alt: 'Tık Profil - Dijital Kartvizit ve QR Menü Sistemi'
            }
        ]
    },
    twitter: {
        card: "summary_large_image",
        title: "Dijital Kartvizit, QR Menü ve Randevu Sistemi | Tık Profil",
        description: "İşletmeniz için ücretsiz dijital kartvizit, QR menü ve online randevu sistemi. 60 saniyede kurulum, komisyonsuz.",
        images: ['https://tikprofil.com/og-image.jpg']
    },
    alternates: {
        canonical: '/',
    }
};

export default function Home() {
    return (
        <>
            <Script
                id="organization-schema"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
            />
            <Script
                id="website-schema"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteSchema) }}
            />
            <Script
                id="faq-schema"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: generateFAQSchema() }}
            />
            <LandingPage />
        </>
    );
}
