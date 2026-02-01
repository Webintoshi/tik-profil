# ADR-003: Next.js 15 App Router Geçişi

## Durum

**Kabul Edildi** - 2026-01-20

## Bağlam

TikProfil web uygulaması Next.js 14 Pages Router kullanıyordu. Next.js 15 ve React 19 yayınlandı.

**Değerlendirme Kriterleri:**

- Server Components performansı
- React 19 özellikleri (use hook, Actions)
- SEO iyileştirmeleri
- Developer experience

## Karar

**Next.js 15 App Router'a geçildi.**

**Kullanılan Özellikler:**

- React Server Components
- Streaming SSR
- Parallel Routes
- Route Handlers (API)
- Server Actions

## Değişiklikler

### Routing Yapısı

```
# Eski (Pages Router)
pages/
├── index.tsx
├── panel/
│   └── dashboard.tsx
└── api/
    └── users.ts

# Yeni (App Router)
src/app/
├── page.tsx
├── layout.tsx
├── panel/
│   └── dashboard/
│       └── page.tsx
└── api/
    └── users/
        └── route.ts
```

### Data Fetching

```typescript
// Eski: getServerSideProps
export async function getServerSideProps() {
  const data = await fetch(...)
  return { props: { data } }
}

// Yeni: Server Component
async function Page() {
  const data = await fetch(...)
  return <Component data={data} />
}
```

## Sonuçlar

### Artılar

- ✅ %40 bundle size azalması
- ✅ Streaming ile daha hızlı TTFB
- ✅ Granular caching kontrolü
- ✅ React 19 hook'ları (use, useFormStatus)
- ✅ Server Actions ile form handling

### Eksiler

- ⚠️ Learning curve
- ⚠️ Bazı library uyumsuzlukları
- ⚠️ "use client" boundary yönetimi

### Migration Süreci

1. Next.js 15 upgrade
2. App directory oluşturma
3. Layout'ları taşıma
4. Page'leri migrate etme
5. API routes → Route handlers
6. Test ve validasyon

## Referanslar

- [Next.js 15 Release Notes](https://nextjs.org/blog/next-15)
- [App Router Migration Guide](https://nextjs.org/docs/app/building-your-application/upgrading)
- [React 19 Features](https://react.dev/blog/2024/12/05/react-19)

---

**Karar Verici:** TikProfil Development Team  
**Tarih:** 2026-01-20
