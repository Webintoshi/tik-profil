export const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Tık Profil',
    description: 'İşletmeler için yeni nesil dijital kartvizit, QR menü ve randevu yönetim platformu. Restoran, otel, kuaför, emlak ve tüm işletmeler için komisyonsuz dijital çözümler.',
    url: 'https://tikprofil.com',
    logo: 'https://tikprofil.com/logo.svg',
    foundingDate: '2024',
    contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+90-XXX-XXX-XXXX',
        contactType: 'customer service',
        areaServed: 'TR',
        availableLanguage: 'Turkish'
    },
    sameAs: [
        'https://www.instagram.com/tikprofil',
        'https://www.linkedin.com/company/tikprofil',
        'https://x.com/tikprofil'
    ],
    address: {
        '@type': 'PostalAddress',
        addressCountry: 'TR',
        addressLocality: 'İstanbul',
        addressRegion: 'İstanbul'
    },
    socialMediaPosting: [
        'https://www.instagram.com/tikprofil',
        'https://x.com/tikprofil'
    ]
};

export const generateOrganizationJsonLd = () => {
    return JSON.stringify(organizationSchema);
};
