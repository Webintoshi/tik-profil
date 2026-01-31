# TikProfil BMad Method - Hızlı Başlangıç

5 dakikada BMad Method'u kullanmaya başlayın.

---

## 📋 Kurulum

**Gereksinim:** Node.js 20+

```bash
# 1. Proje root dizinindeyken
# (BMad Method kurulumu yerel dosyalardır, npm install gerekmez)

# 2. BMad klasör yapısı oluşturuldu ✓
ls bmad/
```

---

## 🚀 İlk Kullanım

### Senaryo 1: Yeni Feature Planlama

```bash
# 1. BMad Master'ı yükle
load bmad/_cfg/agents/bmad-master.md

# 2. Workflow başlat
*workflow-init

# 3. "Yeni feature planlama" seçeneğini seç
# 4. Feature'ı açıkla
#    Örn: "Premium kullanıcılar için analiz dashboard'u"
# 5. BMad otomatik olarak:
#    - Seviye belirler (Level 2)
#    - PRD oluşturur
#    - Story'lere böler
#    - Implementation plan yapar
```

### Senaryo 2: Bug Çözme

```bash
# 1. BMad Master'ı yükle
load bmad/_cfg/agents/bmad-master.md

# 2. Hızlı çözüm
*quick-spec --bug-id=5

# 3. BMad otomatik olarak:
#    - Bug'ı analiz eder
#    - Kod yazarız
#    - Test eder
#    - bug.md'yi günceller
```

### Senaryo 3: Mevcut bug.md'den Bug Aktarma

```bash
# 1. Bug'ları BMad'e aktar
*bug-import

# 2. Çözülecek bug'ı seç
# 3. Çözüm workflow'u başlatılır
```

---

## 📚 Önemli Komutlar

| Komut | Açıklama |
|-------|----------|
| `*workflow-init` | Proje analizi ve yol gösterimi |
| `*quick-spec` | Hızlı bug fix/feature (Level 0-1) |
| `*feature-plan` | Detaylı feature planning (Level 2-4) |
| `*bug-import` | bug.md'den aktar |
| `*dev-story --id=X` | Story implementasyonu |

---

## 🤖 Ajan Yükleme

```bash
# BMad Master
load bmad/_cfg/agents/bmad-master.md

# TikProfil PM
load bmad/_cfg/agents/tikprofil-pm.md

# Full-Stack Dev
load bmad/_cfg/agents/full-stack-dev.md

# Web Architect
load bmad/_cfg/agents/web-architect.md

# Mobile Architect
load bmad/_cfg/agents/mobile-architect.md

# Supabase Expert
load bmad/_cfg/agents/supabase-expert.md

# Test Architect
load bmad/_cfg/agents/test-architect.md
```

---

## 📁 Dosya Yapısı

```
bmad/
├── BMAD.md                    # Ana dokümantasyon
├── QUICKSTART.md             # Bu dosya
├── _cfg/
│   ├── agents/               # Ajan konfigürasyonları
│   │   ├── bmad-master.md
│   │   ├── tikprofil-pm.md
│   │   └── ...
│   ├── workflows/            # Workflow tanımları
│   │   ├── workflow-init.md
│   │   ├── quick-spec.md
│   │   └── ...
│   └── project.yaml          # Proje ayarları
├── _docs/
│   ├── agents.md             # Ajan referansı
│   └── workflows.md          # Workflow referansı
├── templates/
│   ├── prd-template.md       # PRD şablonu
│   └── story-template.md     # Story şablonu
└── stories/                  # Story'ler
    ├── prd-*.md
    ├── story-*.md
    └── bugs/
```

---

## 💡 Kullanım İpuçları

### 1. Seviye Belirleme
```
Level 0: Bug fix (1-4 saat)
Level 1: Küçük feature (1-2 gün)
Level 2: Orta feature (1-2 hafta) ← Çoğu feature
Level 3: Büyük entegrasyon (2-4 hafta)
Level 4: Enterprise (1+ ay)
```

### 2. Cross-Platform Geliştirme
```
Her feature için:
- Web (Next.js) implementasyonu
- Mobile (Expo) implementasyonu
- Shared API güncellemeleri
```

### 3. Mevcut Yapı ile Çalışma
```
# Mevcut bug.md dosyanız var
# Mevcut agents/seo-agent.md dosyanız var
# Bunlar BMad ile entegre çalışır
```

---

## ⚠️ Önemli Notlar

1. **agents/ dizinine dokunmayın** - Mevcut SEO agent'ınız çalışmaya devam eder
2. **bug.md otomatik senkronize olur** - BMad çözülen bug'ları işaretler
3. **Türkçe desteği** - Tüm dokümanlar ve komutlar Türkçe
4. **Update-safe** - `bmad/_cfg/` içindeki değişiklikler korunur

---

## 📖 Daha Fazla Bilgi

- **Ana Dokümantasyon:** `bmad/BMAD.md`
- **Ajan Referansı:** `bmad/_docs/agents.md`
- **Workflow Referansı:** `bmad/_docs/workflows.md`

---

**Hazırsınız!** 🎉

`load bmad/_cfg/agents/bmad-master.md` ile başlayın.
