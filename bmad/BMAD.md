# TikProfil BMad Method Entegrasyonu

> **Versiyon:** 1.0.0  
> **Son Güncelleme:** 2026-02-01  
> **Proje:** TikProfil Monorepo (Web + Mobile)

---

## 🎯 BMad Method Nedir?

BMad Method, insan-AI işbirliğini optimize eden, ölçek uyarlamalı bir geliştirme metodolojisidir. TikProfil projesine entegre edilmiştir.

**Özellikler:**
- 🎨 **Ölçek Uyarlamalı:** Level 0 (Bug fix) → Level 4 (Enterprise)
- 🤖 **12 Uzman Ajan:** Developer, Architect, PM, UX Designer, vb.
- 📋 **34 Workflow:** Brainstorming'den Deployment'a
- 🔧 **Özelleştirilebilir:** Projenize özel adapte edilmiş

---

## 🏗️ TikProfil Proje Yapısı

```
tikprofil-monorepo/
├── 📁 apps/
│   └── tikprofil-mobile/          # Expo/React Native
├── 📁 packages/
│   ├── shared-api/                # API fonksiyonları
│   ├── shared-types/              # TypeScript tipleri
│   ├── shared-utils/              # Utility fonksiyonlar
│   └── shared-constants/          # Sabitler
├── 📁 tikprofil-v2/               # Next.js 15 Web App
│   ├── src/app/                   # App Router
│   ├── src/lib/                   # Kütüphaneler
│   └── supabase/                  # DB migrations
├── 📁 agents/
│   └── seo-agent.md               # Mevcut SEO agent
├── 📁 bmad/                       # ⭐ BMad Method (YENİ)
│   ├── BMAD.md                    # Bu dosya
│   ├── _cfg/
│   │   ├── agents/                # TikProfil-spesifik ajanlar
│   │   └── workflows/             # Özelleştirilmiş workflow'lar
│   ├── _docs/
│   │   ├── prd-template.md
│   │   ├── story-template.md
│   │   └── bug-workflow.md
│   ├── templates/
│   │   ├── feature-prd.md
│   │   └── payment-system-spec.md
│   └── stories/                   # Aktif story'ler
├── 📄 bug.md                      # Mevcut bug tracking
└── 📄 package.json                # Root workspace
```

---

## 🚀 Hızlı Başlangıç

### 1. Workflow Başlatma

```bash
# Herhangi bir agent dosyasını yükledikten sonra:
*workflow-init
```

### 2. Sık Kullanılan Workflow'lar

| Workflow | Kullanım | Seviye |
|----------|----------|--------|
| `*workflow-init` | Proje analizi ve yol haritası | - |
| `*quick-spec` | Hızlı bug fix / küçük feature | Level 0-1 |
| `*feature-plan` | Yeni feature planlama | Level 2-3 |
| `*story-dev` | Story implementasyonu | - |
| `*bug-fix` | Bug çözümü | Level 0 |
| `*tech-spec` | Teknik mimari kararları | Level 3-4 |

### 3. Seviye Seçimi (TikProfil İçin)

```
Level 0: Bug fix'ler (1-2 saat)
   └─ Örnek: Auth token refresh hatası

Level 1: Küçük feature (1-2 gün)
   └─ Örnek: Yeni analiz metriği eklemek

Level 2: Orta feature (1-2 hafta) ⭐ ÇOĞU FEATURE BURADA
   └─ Örnek: Ödeme sistemi, yeni dashboard

Level 3: Büyük entegrasyon (2-4 hafta)
   └─ Örnek: TikTok API entegrasyonu, yeni modül

Level 4: Enterprise scale (1+ ay)
   └─ Örnek: Multi-tenant yapı, white-label sistemi
```

---

## 🤖 TikProfil Ajanları

### Temel Ajanlar

| Ajan | Rol | Kullanım Alanı |
|------|-----|----------------|
| **BMad Master** | Orchestrator | Proje yönetimi, seviye belirleme |
| **TikProfil PM** | Product Manager | PRD, roadmap, story yönetimi |
| **Web Architect** | Next.js/Frontend | tikprofil-v2 mimarisi |
| **Mobile Architect** | React Native/Expo | Mobile app mimarisi |
| **Full-Stack Dev** | Developer | Story implementasyonu |
| **Test Architect** | QA/Testing | Test stratejisi, coverage |
| **UX Designer** | UI/UX | Kullanıcı deneyimi, tasarım |
| **Supabase Expert** | Backend/DB | DB şema, RLS policies, Edge Functions |
| **API Integrator** | Third-party | TikTok API, ödeme gateway'leri |

### Mevcut Agent Entegrasyonu

```yaml
# agents/seo-agent.md → BMad entegre
Mevcut SEO agent'ınız BMad ile çalışabilir.
Kullanım: seo-agent.md dosyasını yükleyip workflow başlatın.
```

---

## 📋 Workflow'lar

### 1. Feature Geliştirme (Ödeme Sistemi Örneği)

```
📋 Phase 1: Analysis
   └─ *brainstorm-payment
      └─ CIS Brainstorming workflow

📋 Phase 2: Planning  
   └─ *create-prd
      └─ TikProfil PM → PRD oluştur
      └─ Çıktı: bmad/stories/prd-payment-system.md

📋 Phase 3: Solutioning (Level 2+)
   └─ *tech-spec
      └─ Web Architect + Mobile Architect
      └─ Supabase Expert (DB şema)
      └─ Çıktı: bmad/stories/tech-spec-payment.md

📋 Phase 4: Implementation
   └─ *create-stories
      └─ PRD → Story'lere böl
      └─ Çıktı: 
         - story-001-payment-gateway.md
         - story-002-subscription-plans.md
         - story-003-webhook-handlers.md
         
   └─ *dev-story (her story için)
      └─ Full-Stack Dev implementasyon
      └─ Test Architect test yazımı
```

### 2. Bug Çözümü (Mevcut bug.md Entegrasyonu)

```
🔴 Mevcut Bug'dan BMad Workflow'u:

1. bug.md'den bir bug seç
2. *quick-spec veya *bug-fix çalıştır
3. BMad otomatik olarak:
   - Bug detaylarını okur
   - Çözüm stratejisi belirler
   - Implementation yapar
   - Test yazar
   - bug.md'yi günceller
```

---

## 📁 Templates

### PRD Template

📄 `bmad/templates/feature-prd.md`

```markdown
# Feature: [İsim]

## Genel Bakış
- **Proje:** TikProfil
- **Modül:** [Web/Mobile/Both]
- **Seviye:** [0-4]
- **Sprint:** 

## Gereksinimler
### Fonksiyonel
- [ ] Req 1
- [ ] Req 2

### Teknik
- [ ] Web: Next.js 15 App Router
- [ ] Mobile: Expo SDK 54
- [ ] DB: Supabase PostgreSQL

## Story'ler
- [ ] STORY-001: 
- [ ] STORY-002:

## Başarı Kriterleri
- [ ] Kriter 1
- [ ] Kriter 2
```

### Story Template

📄 `bmad/templates/story.md`

```markdown
# Story: [ID] - [Başlık]

## Detaylar
- **Feature:** 
- **Priority:** [P0/P1/P2]
- **Points:** 
- **Assignee:** BMad Full-Stack Dev

## Açıklama
[Buraya detaylı açıklama]

## Teknik Notlar
- **Web:** `tikprofil-v2/src/app/...`
- **Mobile:** `apps/tikprofil-mobile/screens/...`
- **API:** `packages/shared-api/...`
- **DB:** Migration dosyası gerekli mi?

## Acceptance Criteria
- [ ] AC1
- [ ] AC2
- [ ] AC3

## Test Senaryoları
- [ ] Test 1
- [ ] Test 2
```

---

## 🔧 Konfigürasyon

### Proje Ayarları

📄 `bmad/_cfg/project.yaml`

```yaml
project:
  name: TikProfil
  type: monorepo
  
platforms:
  web:
    path: tikprofil-v2
    framework: nextjs-15
    language: typescript
    
  mobile:
    path: apps/tikprofil-mobile
    framework: expo-54
    language: typescript
    
  shared:
    - packages/shared-api
    - packages/shared-types
    - packages/shared-utils
    - packages/shared-constants

database:
  provider: supabase
  type: postgresql
  
defaults:
  language: tr  # Türkçe dokümantasyon
  level: 2      # Varsayılan: Orta feature
```

---

## 📝 Kullanım Örnekleri

### Örnek 1: Yeni Dashboard Feature'ı

```bash
# 1. BMad Master'ı yükle
# bmad/_cfg/agents/bmad-master.md

# 2. Workflow başlat
*workflow-init

# 3. "Yeni analiz dashboard'u eklemek istiyorum"
# BMad seviyeyi belirler (Level 2)

# 4. Planning
*create-prd --feature="analytics-dashboard"

# 5. Tech Spec (Level 2 için)
*tech-spec

# 6. Story'lere böl
*create-stories

# 7. Implementasyon
*dev-story --id=STORY-001
```

### Örnek 2: Bug.md'den Bug Çözme

```bash
# 1. bug.md dosyasını göster
"bug.md'deki Bug #5'i çöz"

# 2. Quick Spec Flow
*quick-spec --bug-id=5

# 3. BMad otomatik:
#    - Bug'ı analiz eder
#    - Çözüm üretir
#    - Kod yazar
#    - Test eder
#    - bug.md'yi günceller
```

---

## 🔄 Mevcut Yapı ile Entegrasyon

### Bug.md ↔ BMad

```
bug.md (Mevcut)
    ↓
BMad Bug Workflow
    ↓
*quick-spec / *bug-fix
    ↓
Implementation
    ↓
Güncellenmiş bug.md
```

### SEO Agent ↔ BMad

```
agents/seo-agent.md (Mevcut)
    ↓
BMad CIS Module entegrasyonu
    ↓
*seo-audit workflow
    ↓
SEO raporu + aksiyon planı
```

---

## 📚 Dokümantasyon

| Doküman | Konum | Açıklama |
|---------|-------|----------|
| Ajan Referansı | `bmad/_docs/agents.md` | Tüm ajanların detayları |
| Workflow Kılavuzu | `bmad/_docs/workflows.md` | Tüm workflow'ların kullanımı |
| Story Formatı | `bmad/_docs/story-format.md` | Story yazım standartları |
| Mimari Kararlar | `bmad/_docs/adr/` | Architecture Decision Records |

---

## ⚡ Tips & Tricks

1. **Türkçe Kullanım:** Tüm ajanlar Türkçe komutlara yanıt verir
2. **Seviye Atlama:** Level 2'den Level 3'e geçiş otomatiktir
3. **Cross-Platform:** Bir story hem web hem mobile için olabilir
4. **Shared Packages:** API değişiklikleri önce `shared-api`'de yapılır
5. **DB Migrations:** Supabase migration'ları story acceptance criteria'sına eklenir

---

## 🆘 Destek

**Sık Sorulan Sorular:**

**Q: Mevcut bug.md'yi nasıl entegre ederim?**  
A: `*bug-import` workflow'unu çalıştırın, otomatik tarar.

**Q: Hem web hem mobile için story nasıl yazılır?**  
A: Story template'inde "Platforms: web, mobile" olarak belirtin.

**Q: Supabase Edge Function story'si nasıl?**  
A: `*create-story --type=edge-function` kullanın.

---

**Son Güncelleme:** 2026-02-01 | **Versiyon:** 1.0.0
