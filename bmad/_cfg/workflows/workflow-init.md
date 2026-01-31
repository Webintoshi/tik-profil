---
name: workflow-init
description: BMad Method başlangıç workflow'u. Proje analizi ve yol haritası sağlar.
trigger: "*workflow-init"
---

# Workflow: Init

TikProfil projesi için BMad Method başlangıç workflow'u.

## Amaç

Kullanıcıya:
1. Mevcut proje yapısını göster
2. Uygun workflow'u öner
3. Gerekli ajanları hazırla

## Akış

### 1. Karşılama
```
👋 Merhaba! TikProfil BMad Method'a hoş geldiniz!

Proje yapınız:
├─ 📁 tikprofil-v2/ (Next.js 15 Web)
├─ 📁 apps/tikprofil-mobile/ (Expo Mobile)
├─ 📁 packages/ (Shared API, Types, Utils)
├─ 📁 agents/ (Mevcut SEO agent)
└─ 📁 bmad/ (BMad Method - Yeni!)

Ne yapmak istersiniz?

🎯 [1] Yeni feature planlama
🐛 [2] Bug çözümü
📋 [3] Mevcut task'ları görüntüle
🔧 [4] Mimari kararlar
📚 [5] BMad hakkında bilgi
```

### 2. Seçim Analizi

#### 2.1 Yeni Feature (1)
```
Harika! Yeni feature planlayalım.

Feature hakkında kısaca bilgi verir misiniz?
(Örn: "Kullanıcılar için premium analiz dashboard'u")
```

→ Seviye belirle → *feature-plan workflow'una yönlendir

#### 2.2 Bug Çözümü (2)
```
Hangi bug'ı çözmek istersiniz?

[1] bug.md'den seç
[2] Yeni bug tanımla
[3] BMad bug listesinden seç
```

→ *quick-spec veya *bug-fix workflow'una yönlendir

#### 2.3 Mevcut Task'lar (3)
```
Mevcut durum:

📂 bmad/stories/
├─ 📝 prd-*.md (Feature PRD'leri)
├─ 📄 story-*.md (Implementasyon story'leri)
└─ ✅ completed/ (Tamamlanan story'ler)

Hangi story üzerinde çalışmak istersiniz?
```

#### 2.4 Mimari Kararlar (4)
```
Hangi konuda mimari karar almak istersiniz?

[1] Yeni tech stack seçimi
[2] Database schema tasarımı
[3] API design
[4] Performance optimizasyonu
```

→ *tech-spec workflow'una yönlendir

### 3. Yardımcı Komutlar

```
Yardımcı komutlar:

*workflow-init    - Bu workflow'u başlat
*level-assess     - Feature seviyesi belirle
*quick-spec       - Hızlı feature/bug (Level 0-1)
*feature-plan     - Detaylı feature planning (Level 2-4)
*create-prd       - PRD oluştur
*create-stories   - Story'lere böl
*dev-story        - Story implementasyonu
*tech-spec        - Tech spec yaz
*bug-fix          - Bug çözümü
```

## Çıktı

- Kullanıcıya özel workflow önerisi
- Gerekli ajanların yüklenmesi
- Sonraki adımların belirlenmesi
