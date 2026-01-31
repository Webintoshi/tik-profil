---
name: bug-import
description: Mevcut bug.md dosyasındaki bug'ları BMad workflow'larına aktarır.
trigger: "*bug-import"
---

# Workflow: Bug Import

Mevcut `bug.md` dosyasındaki bug'ları BMad Method'a aktarma workflow'u.

## Amaç

- bug.md'deki açık bug'ları analiz et
- BMad bug tracking sistemine aktar
- Çözüm workflow'ları başlat

## Akış

### 1. Analiz
```
📊 bug.md Analizi

Mevcut durum:
┌──────────────┬────────┐
│ Kategori     │ Sayı   │
├──────────────┼────────┤
│ 🔴 Kritik    │ 0      │ ✅ Düzeltilmiş
│ 🟠 Orta      │ 6      │ 🔄 Açık
│ 🟡 Düşük     │ 6      │ 🔄 Açık
└──────────────┴────────┘

Toplam: 12 açık bug
```

### 2. Bug Listesi
```
🟠 Orta Öncelikli Bug'lar:

[1] Bug #6: Cache invalidation sorunu
    - Dosya: hooks/useAnalytics.ts
    - Platform: Web

[2] Bug #7: Image upload error handling
    - Dosya: components/ImageUploader.tsx
    - Platform: Both

[3] Bug #8: Push notification token refresh
    - Dosya: services/notifications.ts
    - Platform: Mobile

... (6 adet)

🟡 Düşük Öncelikli Bug'lar:

[1] Bug #12: UI spacing inconsistency
    - Dosya: components/Card.tsx
    - Platform: Web

... (6 adet)
```

### 3. Aktarım
```
🔄 BMad'e Aktarım

Hangi bug'ları aktarmak istersiniz?

[1] Tümünü aktar (12 bug)
[2] Sadece orta öncelikli (6 bug)
[3] Sadece düşük öncelikli (6 bug)
[4] Tek tek seç
```

### 4. Story Oluşturma
```
📝 Story'ler Oluşturuluyor...

bmad/stories/bugs/
├── bug-006-cache-invalidation.md
├── bug-007-image-upload-error.md
├── bug-008-push-notification.md
└── ...

Her bug bir story'ye dönüştürüldü.
```

### 5. Çözüm Planı
```
🎯 Çözüm Planı

Önerilen sıra:
1. Bug #6 - Orta (Cache)
2. Bug #7 - Orta (Image Upload)
3. Bug #8 - Orta (Notifications)
...

Başlatmak için:
*bug-fix --id=6
veya
*quick-spec --bug-id=6
```

## Bug Story Formatı

```markdown
# BUG-[XXX]: [Başlık]

## Bilgiler
- **Kaynak:** bug.md #[Numara]
- **Öncelik:** Kritik/Orta/Düşük
- **Platform:** Web/Mobile/Both
- **Durum:** Açık

## Sorun Açıklaması
[bug.md'den detaylı açıklama]

## Teknik Detaylar
- **Dosya:** [Dosya yolu]
- **Satır:** [Satır numarası]
- **Platform:** [Detay]

## Mevcut Davranış
[Sorun nedir?]

## Beklenen Davranış
[Nasıl olmalı?]

## Çözüm Notları
[bug.md'deki önerilen çözüm]

## Acceptance Criteria
- [ ] Bug çözüldü
- [ ] Test yazıldı
- [ ] Regression test yapıldı
- [ ] bug.md güncellendi
```

## Örnek

```markdown
# BUG-006: Cache Invalidation Sorunu

## Bilgiler
- **Kaynak:** bug.md #6
- **Öncelik:** Orta
- **Platform:** Web
- **Durum:** Açık

## Sorun Açıklaması
useAnalytics hook'u cache'i invalid etmiyor. 
Kullanıcı yeni veri eklediğinde eski veriler görünüyor.

## Teknik Detaylar
- **Dosya:** hooks/useAnalytics.ts
- **Satır:** 45-60
- **Hook:** useSWR kullanımı

## Mevcut Davranış
```typescript
const { data } = useSWR('/api/analytics', fetcher);
// mutate() çağrılmıyor
```

## Beklenen Davranış
Veri değişikliği sonrası cache invalid edilmeli.

## Çözüm Notları
```typescript
const { data, mutate } = useSWR('/api/analytics', fetcher);

// Veri güncelleme sonrası
await updateAnalytics(newData);
mutate(); // Cache invalidate
```

## Acceptance Criteria
- [ ] mutate() çağrısı eklendi
- [ ] Test yazıldı
- [ ] Manuel test yapıldı
- [ ] bug.md güncellendi
```

## Komutlar

```
*bug-import          - bug.md'den aktar
*bug-import --all    - Tümünü aktar
*bug-fix --id=6      - Belirli bug'ı çöz
```
