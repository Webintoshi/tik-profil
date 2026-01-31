---
name: quick-spec
description: Hızlı bug fix ve küçük feature'lar için Level 0-1 workflow'u.
trigger: "*quick-spec"
level: 0-1
duration: 1 saat - 2 gün
---

# Workflow: Quick Spec

Hızlı implementasyon workflow'u. Bug fix'ler ve küçük feature'lar için.

## Kullanım

```
*quick-spec
veya
*quick-spec --bug-id=5
veya
*quick-spec --description="yeni analiz metriği ekle"
```

## Akış

### 1. Giriş
```
⚡ Quick Spec Workflow
Level: 0-1 | Süre: 1 saat - 2 gün

Bu workflow ile hızlıca:
- Bug fix'ler yapabilir
- Küçük feature'lar ekleyebilir
- UI değişiklikleri yapabilirsiniz.
```

### 2. Hedef Belirleme

#### Senaryo A: Bug Fix (bug.md'den)
```
bug.md'den bug seçin:

🔴 Kritik: 0 adet
🟠 Orta: 6 adet  
🟡 Düşük: 6 adet

Hangi bug'ı çözmek istersiniz?
(Örn: "Bug #5" veya açıklama yazın)
```

#### Senaryo B: Yeni Feature
```
Feature'ı kısaca açıklayın:
- Ne yapacak?
- Hangi platform? (Web/Mobile/Both)
- Tahmini süre?
```

### 3. Hızlı Analiz

```
⚡ Hızlı Analiz

┌─────────────────────────────────────┐
│ Feature/Bug: [Açıklama]             │
│ Seviye: Level 0/1                   │
│ Platform: [Web/Mobile/Both]         │
│ Tahmini Süre: [X saat/gün]          │
└─────────────────────────────────────┘

Plan:
1. Mevcut kod analizi
2. Implementation
3. Test
4. bug.md güncellemesi (varsa)
```

### 4. Implementation

Full-Stack Dev ajanı devreye girer:

```
[Full-Stack Dev] Implementasyon başlıyor...

✅ Dosyalar analiz edildi
✅ Çözüm belirlendi
📝 Kod yazılıyor...
```

### 5. Test

```
[Test Architect] Test kontrolü...

✅ Unit test yazıldı
✅ Manuel test yapıldı
```

### 6. Tamamlama

```
✅ Quick Spec tamamlandı!

Yapılanlar:
- [X] Kod implementasyonu
- [X] Test yazımı
- [X] Lint/type-check
- [X] bug.md güncellemesi (varsa)

Sonraki adımlar:
- Code review yapılabilir
- Deploy edilebilir
```

## Örnek Kullanım

### Bug Fix
```
Kullanıcı: *quick-spec --bug-id=5

BMad: Bug #5 analiz ediliyor...
      Auth token refresh sorunu tespit edildi.
      
      Implementation:
      - auth.ts: refreshToken() eklendi
      - middleware.ts: token check güncellendi
      
      Test:
      - auth.test.ts: refresh flow test edildi
      
      ✅ Tamamlandı! bug.md güncellendi.
```

### Küçük Feature
```
Kullanıcı: *quick-spec --description="Profil sayfasına son giriş tarihi ekle"

BMad: Feature analizi:
      - Level 1
      - Platform: Both
      - Süre: 2-3 saat
      
      Implementation:
      - shared-api: updateProfile() güncellendi
      - Web: ProfilePage.tsx güncellendi
      - Mobile: ProfileScreen.tsx güncellendi
      - DB: users.last_login eklendi
      
      ✅ Tamamlandı!
```

## Checklist

```markdown
Quick Spec tamamlama kontrolü:

- [ ] Kod implementasyonu yapıldı
- [ ] Test yazıldı (en az 1 test)
- [ ] TypeScript hatası yok
- [ ] Lint hatası yok
- [ ] Manuel test yapıldı
- [ ] bug.md güncellendi (bug fix ise)
- [ ] Değişiklikler açıklandı
```
