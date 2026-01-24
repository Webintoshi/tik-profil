export const webSiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Tık Profil',
    alternateName: 'TikProfil',
    url: 'https://tikprofil.com',
    description: 'İşletmeler için yeni nesil dijital kartvizit, QR menü ve randevu yönetim platformu. Restoran, otel, kuaför, emlak ve tüm işletmeler için komisyonsuz dijital çözümler.',
    inLanguage: 'tr-TR',
    potentialAction: {
        '@type': 'SearchAction',
        target: {
            '@type': 'EntryPoint',
            urlTemplate: 'https://tikprofil.com/blog?q={search_term_string}'
        },
        'query-input': {
            '@type': 'PropertyValueSpecification',
            valueRequired: true,
            valueName: 'search_term_string'
        }
    },
    publisher: {
        '@type': 'Organization',
        name: 'Tık Profil',
        url: 'https://tikprofil.com'
    },
    copyrightYear: '2025',
    copyrightHolder: {
        '@type': 'Organization',
        name: 'Tık Profil'
    }
};

export const generateWebSiteJsonLd = () => {
    return JSON.stringify(webSiteSchema);
};
