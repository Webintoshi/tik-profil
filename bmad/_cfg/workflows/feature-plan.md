---
name: feature-plan
description: Orta ve büyük feature'lar için detaylı planning workflow'u. Level 2-4.
trigger: "*feature-plan"
level: 2-4
duration: 1-4 hafta
---

# Workflow: Feature Plan

Detaylı feature planning workflow'u. Orta ve büyük feature'lar için.

## Kullanım

```
*feature-plan
veya
*feature-plan --name="premium-analytics"
```

## Akış

### Phase 1: Analysis (Opsiyonel)
```
📋 Phase 1: Analysis

Eğer fikir aşamasındaysanız, brainstorming yapılabilir.
Değilse Phase 2'ye geçebiliriz.

Brainstorming yapmak ister misiniz? [Evet/Hayır]
```

→ Evet: Brainstorming workflow'una yönlendir
→ Hayır: Phase 2'ye devam

### Phase 2: Planning (Zorunlu)
```
📋 Phase 2: Planning

[TikProfil PM] PRD oluşturuluyor...

Feature detaylarını sağlayın:
1. Feature adı?
2. Hangi problemi çözüyor?
3. Hedef kullanıcı?
4. Platform? (Web/Mobile/Both)
5. Öncelik? (P0/P1/P2)
```

PM ajanı PRD yazmaya başlar:
```
📝 PRD Oluşturuluyor...

bmad/stories/prd-[feature-name].md
```

### Phase 3: Solutioning (Level 3-4 için)
```
🏗️ Phase 3: Solutioning

[Web Architect] Web tech spec hazırlanıyor...
[Mobile Architect] Mobile tech spec hazırlanıyor...
[Supabase Expert] DB schema tasarlanıyor...

Çıktılar:
- bmad/stories/tech-spec-[feature]-web.md
- bmad/stories/tech-spec-[feature]-mobile.md
- bmad/stories/db-schema-[feature].md
```

### Phase 4: Story Creation
```
📚 Phase 4: Story Creation

[TikProfil PM] PRD story'lere bölünüyor...

Story'ler:
├── STORY-001: [Açıklama] (P0, 5 pts)
├── STORY-002: [Açıklama] (P0, 3 pts)
├── STORY-003: [Açıklama] (P1, 5 pts)
└── STORY-004: [Açıklama] (P1, 3 pts)

Toplam: 4 story, 16 points
```

### Phase 5: Implementation Plan
```
🚀 Phase 5: Implementation Plan

Önerilen sıra:
1. STORY-001: Temel yapı (P0)
2. STORY-002: Core feature (P0)
3. STORY-003: İkincil feature (P1)
4. STORY-004: Polish (P1)

Bağımlılıklar:
- STORY-002 → STORY-001'e bağımlı
- STORY-003 → STORY-002'ye bağımlı
```

## Dokümanlar

### 1. PRD
```markdown
# PRD: [Feature Name]

## Genel Bakış
...

## Story Mapping
...

## Başarı Kriterleri
...
```

### 2. Tech Spec (Web)
```markdown
# Tech Spec (Web): [Feature Name]

## Mimari Kararlar
...

## Component Architecture
...

## API Design
...
```

### 3. Tech Spec (Mobile)
```markdown
# Tech Spec (Mobile): [Feature Name]

## Navigation Structure
...

## Data Flow
...

## Platform Considerations
...
```

### 4. Stories
```markdown
# STORY-001: [Title]

## Detaylar
- Feature: [Name]
- Priority: P0
- Points: 5

## Acceptance Criteria
...
```

## Tamamlama Kontrolü

```markdown
Feature Plan tamamlandı:

PRD:
- [ ] Problem tanımı net
- [ ] Kullanıcı hikayeleri yazıldı
- [ ] Fonksiyonel gereksinimler tanımlandı
- [ ] Story mapping yapıldı

Tech Spec (Level 2+):
- [ ] Mimari kararlar alındı
- [ ] Component architecture tanımlandı
- [ ] API design yapıldı
- [ ] DB schema tasarlandı

Stories:
- [ ] Her story'nin AC'si net
- [ ] Story point'ler atandı
- [ ] Bağımlılıklar belirlendi
- [ ] Öncelik sıralaması yapıldı
```

## Örnek: Ödeme Sistemi

```
Kullanıcı: *feature-plan --name="payment-system"

BMad: 🏗️ Feature Plan: Payment System

Phase 2: Planning
[TikProfil PM] PRD oluşturuluyor...

PRD: Premium Abonelik ve Ödeme Sistemi
- Modül: Payment
- Platform: Both
- Seviye: 2

Story Mapping:
├── STORY-001: Stripe Checkout (Web) (P0, 5 pts)
├── STORY-002: In-App Purchase (Mobile) (P0, 5 pts)
├── STORY-003: Abonelik Yönetimi (Both) (P0, 3 pts)
├── STORY-004: Webhook Handler (Backend) (P0, 3 pts)
└── STORY-005: Fatura Sayfası (Web) (P1, 2 pts)

Phase 3: Solutioning
[Web Architect] Stripe Elements entegrasyonu
[Mobile Architect] RevenueCat entegrasyonu
[Supabase Expert] Subscriptions tablosu

Dokümanlar:
✅ bmad/stories/prd-payment-system.md
✅ bmad/stories/tech-spec-payment-web.md
✅ bmad/stories/tech-spec-payment-mobile.md
✅ bmad/stories/story-001-stripe-checkout.md
...

Devam etmek için:
*dev-story --id=STORY-001
```
