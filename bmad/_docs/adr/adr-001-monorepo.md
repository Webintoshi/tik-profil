# ADR-001: Monorepo Yapısı Kararı

## Durum

**Kabul Edildi** - 2026-01-15

## Bağlam

TikProfil projesi başlangıçta tek bir Next.js uygulaması olarak geliştirildi. Mobile uygulama eklenmesiyle birlikte kod paylaşımı ve yönetim karmaşıklığı arttı.

**Problem:**

- Web ve mobile arasında kod tekrarı
- Type tanımlamalarının senkronizasyon sorunu
- API çağrılarının farklı implementasyonları
- Bağımlılık yönetimi zorluğu

## Karar

Monorepo yapısına geçildi:

```
tikprofil-monorepo/
├── apps/
│   └── tikprofil-mobile/      # Expo/React Native
├── packages/
│   ├── shared-api/            # API fonksiyonları
│   ├── shared-types/          # TypeScript tipleri
│   ├── shared-utils/          # Utility fonksiyonlar
│   └── shared-constants/      # Sabitler
└── tikprofil-v2/              # Next.js Web App
```

**Seçilen Araçlar:**

- **pnpm** - Workspace yönetimi
- **Turbo** - Build orchestration
- **TypeScript** - Strict mode

## Alternatifler

### Alternatif 1: Ayrı Repolar

- **Artılar:** Bağımsız deployment, izole CI/CD
- **Eksiler:** Kod tekrarı, senkronizasyon zorluğu
- **Karar:** Reddedildi

### Alternatif 2: NPM Packages

- **Artılar:** Versiyonlama, bağımsız yayınlama
- **Eksiler:** Yavaş iteration, karmaşık workflow
- **Karar:** Reddedildi

## Sonuçlar

### Artılar

- ✅ Tek commit'te cross-platform değişiklik
- ✅ Type-safe API paylaşımı
- ✅ Tutarlı bağımlılık versiyonları
- ✅ Unified linting ve formatting

### Eksiler

- ⚠️ İlk setup karmaşıklığı
- ⚠️ Build süresi artabilir
- ⚠️ Öğrenme eğrisi

### Riskler ve Mitigasyon

| Risk | Mitigasyon |
|------|-----------|
| Build süresi | Turbo caching |
| IDE performansı | TypeScript project references |
| CI/CD karmaşıklığı | Targeted builds |

## Referanslar

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)

---

**Karar Verici:** TikProfil Development Team
**Tarih:** 2026-01-15
