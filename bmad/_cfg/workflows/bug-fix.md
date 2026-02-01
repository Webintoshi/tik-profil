---
name: bug-fix
description: Bug çözümü workflow'u. Hataları analiz eder ve düzeltir.
trigger: "*bug-fix"
---

# Workflow: Bug Fix

TikProfil projesi için bug çözüm workflow'u.

## Amaç

1. Bug'ı analiz et
2. Root cause bul
3. Çözümü implemente et
4. Regression test yaz
5. bug.md güncelle

## Parametreler

```
*bug-fix                      # Yeni bug tanımla
*bug-fix --id=5               # bug.md'den #5
*bug-fix --critical           # Kritik bug'lar
*bug-fix --description="..."  # Açıklama ile
```

## Ajan

**Full-Stack Dev** - Bug çözümü

## Akış

### 1. Bug Kaydı

```
🐛 Bug kaydı:

Bug ID: BUG-[XXX]
Severity: [Kritik/Orta/Düşük]
Platform: [Web/Mobile/Both]
Module: [Module adı]

Açıklama:
[Bug açıklaması]

Reproduction Steps:
1. [Adım 1]
2. [Adım 2]
3. [Adım 3]

Expected: [Beklenen davranış]
Actual: [Gerçekleşen davranış]
```

### 2. Root Cause Analysis

```
🔍 Root Cause Analizi:

Etkilenen dosyalar:
├─ [dosya1.tsx] - [satır numarası]
├─ [dosya2.ts] - [satır numarası]
└─ [dosya3.sql] - [satır numarası]

Root Cause:
[Hatanın teknik açıklaması]

Impact:
- [Etkilenen kullanıcı sayısı]
- [Etkilenen feature'lar]
```

### 3. Solution Design

```
💡 Çözüm Planı:

Approach: [Seçilen yaklaşım]

Değişiklikler:
1. [Dosya 1]: [Değişiklik açıklaması]
2. [Dosya 2]: [Değişiklik açıklaması]

Riskler:
- [Potansiyel risk ve önlem]

Onaylıyor musunuz? (e/h)
```

### 4. Implementation

```
💻 Fix uygulanıyor...

[1/3] [Dosya 1] düzeltildi ✅
[2/3] [Dosya 2] düzeltildi ✅
[3/3] Test yazıldı ✅

Fix tamamlandı!
```

### 5. Verification

```
✅ Verification:

Original bug:
- [x] Artık reproduce edilmiyor ✅

Regression tests:
- [x] Mevcut testler pass ✅
- [x] Yeni regression test eklendi ✅

Side effects:
- [x] İlgili feature'lar kontrol edildi ✅
```

### 6. bug.md Güncelleme

```
📝 bug.md güncelleniyor...

[Bug #5 - ÇÖZÜLDÜ]
- Fix Date: [Tarih]
- Fixed By: BMad Full-Stack Dev
- PR/Commit: [ref]
- Regression Test: test/[dosya].test.ts

✅ Bug kapatıldı!
```

## Bug Severity Guide

| Severity | Tanım | Response Time |
|----------|-------|---------------|
| **Kritik** | Prodüksiyon down, veri kaybı | Immediate |
| **Yüksek** | Major feature çalışmıyor | < 4 saat |
| **Orta** | Feature kısmen çalışıyor | < 24 saat |
| **Düşük** | Kozmetik, edge case | Next sprint |

## Bug Template (bug.md için)

```markdown
## Bug #[XXX]: [Başlık]

**Severity:** [Kritik/Yüksek/Orta/Düşük]
**Status:** [Açık/İnceleniyor/Çözüldü]
**Platform:** [Web/Mobile/Both]
**Reporter:** [İsim]
**Date:** [Tarih]

### Açıklama
[Detaylı açıklama]

### Reproduction Steps
1. [Adım]
2. [Adım]

### Expected vs Actual
- **Expected:** [Beklenen]
- **Actual:** [Gerçekleşen]

### Screenshots/Logs
[Varsa ekle]

### Fix Notes (çözüldükten sonra)
- **Root Cause:** [Sebep]
- **Solution:** [Çözüm]
- **Commit:** [Link]
```

## Çıktı

- ✅ Bug fix kodu
- ✅ Regression test
- ✅ Güncellenmiş bug.md
- ✅ bmad/stories/bugs/bug-XXX.md (opsiyonel)
