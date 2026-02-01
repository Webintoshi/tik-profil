---
name: dev-story
description: Story implementasyonu workflow'u. Story'yi kod olarak hayata geçirir.
trigger: "*dev-story"
---

# Workflow: Dev Story

TikProfil projesi için story geliştirme workflow'u.

## Amaç

1. Story'yi analiz et
2. Kodu implemente et
3. Testleri yaz
4. Story'yi tamamla

## Parametreler

```
*dev-story --id=STORY-001     # Belirli story
*dev-story --id=1             # ID ile
*dev-story --latest           # En son story
*dev-story --priority=P0      # P0 priority story'ler
```

## Ajan

**Full-Stack Dev** - Ana implementasyon ajanı

## Akış

### 1. Story Yükleme

```
📋 Story yükleniyor...

STORY-001: [Başlık]
├─ Priority: P0
├─ Points: 5
├─ Platform: Web + Mobile
└─ Status: In Progress

Acceptance Criteria:
- [ ] AC1: [Kriter]
- [ ] AC2: [Kriter]
- [ ] AC3: [Kriter]

Başlıyorum...
```

### 2. Analiz

```
🔍 Teknik Analiz:

Değiştirilecek dosyalar:
├─ Web:
│   ├─ tikprofil-v2/src/app/[path]/page.tsx
│   └─ tikprofil-v2/src/components/[comp].tsx
├─ Mobile:
│   └─ apps/tikprofil-mobile/screens/[Screen].tsx
├─ API:
│   └─ packages/shared-api/src/[module].ts
└─ DB:
    └─ tikprofil-v2/supabase/migrations/[date]_[name].sql

Dependency check: ✅
```

### 3. Implementation

```
💻 Implementasyon:

[1/4] API Layer...
[2/4] Web Components...
[3/4] Mobile Screens...
[4/4] Database Migration...

✅ Kod tamamlandı!
```

### 4. Test Yazma

```
🧪 Testler yazılıyor...

- [ ] Unit Tests
- [ ] Integration Tests
- [ ] Component Tests

✅ Testler tamamlandı!
```

### 5. Verification

```
✅ Verification Checklist:

Acceptance Criteria:
- [x] AC1: [Kriter] ✅
- [x] AC2: [Kriter] ✅
- [x] AC3: [Kriter] ✅

Tests:
- [x] Unit tests pass ✅
- [x] Integration tests pass ✅

Linting:
- [x] ESLint ✅
- [x] TypeScript ✅

Story Status: COMPLETED ✅
```

### 6. Story Güncelleme

```
📝 Story güncelleniyor...

bmad/stories/story-001-[name].md
├─ Status: Completed
├─ Completed Date: [Tarih]
└─ Notes: [Implementasyon notları]

Sonraki story için: *dev-story --id=STORY-002
```

## Best Practices

### Kod Kalitesi

- [ ] TypeScript strict mode
- [ ] Proper error handling
- [ ] Loading states
- [ ] Empty states
- [ ] Edge cases

### Cross-Platform

- [ ] API önce shared-api'de
- [ ] Types önce shared-types'ta
- [ ] Web ve Mobile senkron

### Database

- [ ] Migration reversible
- [ ] RLS policies test edildi
- [ ] Indexes optimize

## Troubleshooting

### Story bulunamadı

```
bmad/stories/ klasöründe story dosyasını kontrol edin.
Format: story-XXX-[name].md
```

### Test failure

```
1. Error log'u incele
2. Kodu düzelt
3. *dev-story --id=XXX --retry
```

## Çıktı

- ✅ Implementasyon kodu
- ✅ Test dosyaları
- ✅ Güncellenmiş story dosyası
- ✅ Migration (gerekirse)
