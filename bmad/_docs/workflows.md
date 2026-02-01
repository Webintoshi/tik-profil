# BMad Workflows - TikProfil

Tüm workflow'ların detaylı referansı.

## Workflow Listesi

| Workflow | Level | Süre | Açıklama |
|----------|-------|------|----------|
| `*workflow-init` | - | - | Proje analizi ve başlangıç |
| `*quick-spec` | 0-1 | 1s-2g | Hızlı bug fix/feature |
| `*feature-plan` | 2-4 | 1-4h | Detaylı feature planning |
| `*bug-import` | - | - | bug.md entegrasyonu |
| `*tech-spec` | 2-4 | - | Teknik spesifikasyon |
| `*dev-story` | - | - | Story implementasyonu |
| `*bug-fix` | 0-1 | 1s-4s | Bug çözümü workflow'u |

---

## *workflow-init

**Açıklama:** Proje analizi ve başlangıç workflow'u

**Kullanım:**

```
*workflow-init
```

**Ajan:** BMad Master

**Çıktı:**

- Proje yapısı analizi
- Workflow önerisi
- Sonraki adımlar

**Akış:**

1. Proje yapısını göster
2. Kullanıcıdan hedef al
3. Uygun workflow'u öner
4. Gerekli ajanları hazırla

---

## *quick-spec

**Açıklama:** Hızlı bug fix ve küçük feature'lar

**Kullanım:**

```
*quick-spec
*quick-spec --bug-id=5
*quick-spec --description="yeni metrik ekle"
```

**Ajan:** Full-Stack Dev

**Seviye:** 0-1

**Süre:** 1 saat - 2 gün

**Çıktı:**

- Kod implementasyonu
- Test
- bug.md güncellemesi (varsa)

**Akış:**

1. Hedef belirleme (bug/feature)
2. Hızlı analiz
3. Implementation
4. Test
5. Tamamlama

**Ne zaman kullanılır:**

- Bug fix'ler
- Küçük UI değişiklikleri
- Basit feature'lar
- Hızlı prototipleme

---

## *feature-plan

**Açıklama:** Orta ve büyük feature'lar için detaylı planning

**Kullanım:**

```
*feature-plan
*feature-plan --name="premium-analytics"
```

**Ajanlar:**

- TikProfil PM (PRD, Stories)
- Web Architect (Web tech spec)
- Mobile Architect (Mobile tech spec)
- Supabase Expert (DB schema)

**Seviye:** 2-4

**Süre:** 1-4 hafta

**Çıktı:**

- PRD
- Tech Spec (Level 2+)
- Story'ler
- Implementation plan

**Akış:**

1. **Phase 1:** Analysis (opsiyonel)
2. **Phase 2:** Planning (PRD)
3. **Phase 3:** Solutioning (tech spec)
4. **Phase 4:** Story Creation

**Ne zaman kullanılır:**

- Ödeme sistemi
- Yeni dashboard
- Büyük entegrasyonlar
- Enterprise feature'lar

---

## *bug-import

**Açıklama:** Mevcut bug.md'yi BMad'e aktar

**Kullanım:**

```
*bug-import
*bug-import --all
```

**Ajan:** BMad Master

**Çıktı:**

- Bug analizi
- Story'ler (`bmad/stories/bugs/`)
- Çözüm planı

**Akış:**

1. bug.md analizi
2. Bug listesi göster
3. Aktarım seçimi
4. Story oluşturma
5. Çözüm planı

**Ne zaman kullanılır:**

- Mevcut bug'ları BMad'e aktarmak için
- Eski bug'ları organize etmek için

---

## *tech-spec

**Açıklama:** Teknik spesifikasyon yazma

**Kullanım:**

```
*tech-spec
*tech-spec --platform=web
*tech-spec --platform=mobile
*tech-spec --platform=db
```

**Ajanlar:**

- Web Architect (Web)
- Mobile Architect (Mobile)
- Supabase Expert (DB)

**Çıktı:**

- Tech spec dokümanı
- Mimari kararlar
- Implementation guide

**Ne zaman kullanılır:**

- Level 2+ feature'lar
- Mimari kararlar
- Tech stack seçimi

---

## *dev-story

**Açıklama:** Story implementasyonu

**Kullanım:**

```
*dev-story --id=STORY-001
*dev-story --id=1
```

**Ajan:** Full-Stack Dev

**Çıktı:**

- Kod implementasyonu
- Test'ler
- Story güncellemesi

**Akış:**

1. Story analizi
2. Implementation
3. Test yazma
4. Code review hazırlığı

**Ne zaman kullanılır:**

- Story geliştirme
- PR oluşturma öncesi

---

## Workflow Seçim Rehberi

```
Yapmak istediğiniz iş → Önerilen Workflow

🐛 Bug çözme
   → *quick-spec (hızlı)
   → *bug-import (bug.md'den aktar)

✨ Küçük feature (1-2 gün)
   → *quick-spec

🎯 Orta feature (1-2 hafta)
   → *feature-plan
   → *dev-story (implementasyon)

🏢 Büyük feature (2+ hafta)
   → *feature-plan
   → *tech-spec
   → *dev-story

📊 Proje analizi
   → *workflow-init

🏗️ Mimari kararlar
   → *tech-spec
```

## Workflow Kombinasyonları

### Yeni Feature (Ödeme Sistemi Örneği)

```
1. *workflow-init
   └─ Seviye: Level 2

2. *feature-plan --name="payment-system"
   └─ PRD oluştur
   └─ Story'lere böl

3. *tech-spec --platform=web
   *tech-spec --platform=mobile
   └─ Detaylı tech spec'ler

4. *dev-story --id=STORY-001
   *dev-story --id=STORY-002
   └─ Story'leri implemente et
```

### Bug Çözümü

```
1. *bug-import (eğer bug.md'de varsa)
   └─ Story'ye dönüştür

2. *quick-spec --bug-id=5
   └─ Çöz ve test et
```

## Workflow Çıktıları

### PRD Çıktısı

```
bmad/stories/
└── prd-[feature-name].md
```

### Story Çıktısı

```
bmad/stories/
├── story-[XXX]-[title].md
└── bugs/
    └── bug-[XXX]-[title].md
```

### Tech Spec Çıktısı

```
bmad/stories/
├── tech-spec-[feature]-web.md
├── tech-spec-[feature]-mobile.md
└── db-schema-[feature].md
```

## Özelleştirme

Workflow'ları `_cfg/workflows/` dizinindeki dosyalardan özelleştirebilirsiniz.

Yeni workflow eklemek için:

1. `_cfg/workflows/my-workflow.md` oluştur
2. Front matter'a trigger ekle
3. Akışı tanımla
