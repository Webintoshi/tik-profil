---
name: tech-spec
description: Teknik spesifikasyon oluşturma workflow'u. Level 2+ feature'lar için detaylı mimari planı sağlar.
trigger: "*tech-spec"
---

# Workflow: Tech Spec

TikProfil projesi için teknik spesifikasyon oluşturma workflow'u.

## Amaç

1. Feature için detaylı teknik plan oluştur
2. Mimari kararları belgele
3. Implementation guide hazırla

## Parametreler

```
*tech-spec                    # Genel tech spec
*tech-spec --platform=web     # Sadece Web
*tech-spec --platform=mobile  # Sadece Mobile
*tech-spec --platform=db      # Database schema
*tech-spec --prd=payment      # Belirli bir PRD için
```

## Ajanlar

| Platform | Ajan |
|----------|------|
| Web | Web Architect |
| Mobile | Mobile Architect |
| Database | Supabase Expert |
| Full | Tüm ajanlar |

## Akış

### 1. PRD Analizi

```
📋 PRD'yi analiz ediyorum...

Feature: [Feature Adı]
Platform: [Web/Mobile/Both]
Seviye: [2/3/4]

Teknik gereksinimler:
- [ ] Web: [Gereksinim listesi]
- [ ] Mobile: [Gereksinim listesi]
- [ ] API: [Endpoint listesi]
- [ ] DB: [Schema değişiklikleri]
```

### 2. Mimari Kararlar

```
🏗️ Mimari Kararlar:

1. [Karar 1]
   - Seçenek A: [Açıklama]
   - Seçenek B: [Açıklama]
   → Önerim: [Seçenek] çünkü [neden]

2. [Karar 2]
   ...
```

### 3. Tech Spec Oluşturma

```
📝 Tech Spec oluşturuluyor...

Çıktı: bmad/stories/tech-spec-[feature].md
```

## Çıktı Formatı

```markdown
# Tech Spec: [Feature Adı]

## 1. Genel Bakış
- **PRD:** [Link]
- **Seviye:** [2/3/4]
- **Platform:** [Web/Mobile/Both]

## 2. Mimari Kararlar

### ADR-001: [Karar Başlığı]
- **Durum:** Kabul Edildi
- **Bağlam:** [Neden bu karar gerekti?]
- **Karar:** [Ne karar verildi?]
- **Sonuçlar:** [Artılar ve eksiler]

## 3. Web Mimarisi

### 3.1 Route Yapısı
\`\`\`
tikprofil-v2/src/app/
├── [route]/
│   ├── page.tsx
│   ├── layout.tsx
│   └── components/
\`\`\`

### 3.2 Component Yapısı
[Component hiyerarşisi]

### 3.3 State Management
[State stratejisi]

## 4. Mobile Mimarisi

### 4.1 Navigation
[Navigation yapısı]

### 4.2 Screen Yapısı
[Screen hiyerarşisi]

## 5. API Tasarımı

### 5.1 Endpoints
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | /api/xxx | [Açıklama] |
| POST | /api/xxx | [Açıklama] |

### 5.2 Shared API
[packages/shared-api yapısı]

## 6. Database Schema

### 6.1 Tablolar
[Tablo tanımları]

### 6.2 RLS Policies
[Policy tanımları]

### 6.3 Migration
[Migration planı]

## 7. Implementation Plan

### Phase 1: Foundation
- [ ] Task 1
- [ ] Task 2

### Phase 2: Core
- [ ] Task 3
- [ ] Task 4

## 8. Test Stratejisi
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
```

## Sonraki Adımlar

Tech spec tamamlandıktan sonra:

1. PRD ile cross-check
2. Story'lere dönüştürme (*create-stories)
3. Implementation başlama (*dev-story)
