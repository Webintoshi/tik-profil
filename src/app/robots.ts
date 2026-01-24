import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/webintoshi/', '/giris-yap/', '/kayit-ol/', '/sifre-sifirla/', '/sifremi-unuttum/', '/danisman-panel/', '/panel/', '/api/'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/dashboard/', '/webintoshi/', '/giris-yap/', '/kayit-ol/', '/sifre-sifirla/', '/sifremi-unuttum/', '/danisman-panel/', '/panel/', '/api/'],
      },
    ],
    sitemap: 'https://tikprofil.com/sitemap.xml',
    host: 'tikprofil.com',
  };
}
