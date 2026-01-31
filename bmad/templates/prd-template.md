# PRD: [Feature Adı]

## 1. Genel Bakış

| Alan | Değer |
|------|-------|
| **Feature** | [Ad] |
| **TikProfil Modülü** | [Analytics/Dashboard/Payment/Profile/Auth/Diğer] |
| **Platform** | [Web/Mobile/Both] |
| **Seviye** | [0/1/2/3/4] |
| **Tahmini Süre** | [X gün/hafta] |
| **Priority** | [P0/P1/P2] |

## 2. Problem & Çözüm

### 2.1 Problem
[Ne sorunu çözüyor? Kullanıcı neden bunu istiyor?]

### 2.2 Çözüm
[Nasıl çözüyor? Ana fikir nedir?]

### 2.3 Başarı Kriterleri
- [ ] Kriter 1
- [ ] Kriter 2
- [ ] Kriter 3

## 3. Kullanıcı Hikayeleri

- [ ] Bir **[kullanıcı tipi]** olarak **[amaç]** istiyorum çünkü **[neden]**
- [ ] Bir **[kullanıcı tipi]** olarak **[amaç]** istiyorum çünkü **[neden]**

## 4. Fonksiyonel Gereksinimler

### 4.1 Web Gereksinimleri
| ID | Gereksinim | Öncelik |
|----|------------|---------|
| FR-W1 | [Detay] | P0/P1/P2 |
| FR-W2 | [Detay] | P0/P1/P2 |

### 4.2 Mobile Gereksinimleri
| ID | Gereksinim | Öncelik |
|----|------------|---------|
| FR-M1 | [Detay] | P0/P1/P2 |
| FR-M2 | [Detay] | P0/P1/P2 |

### 4.3 API Gereksinimleri
| ID | Endpoint/Fonksiyon | Açıklama |
|----|-------------------|----------|
| API-1 | [Detay] | [Açıklama] |
| API-2 | [Detay] | [Açıklama] |

## 5. Teknik Gereksinimler

### 5.1 Web
- **Framework:** Next.js 15 App Router
- **Rendering:** [SSR/SSG/ISR/Client]
- **State Management:** [SWR/Context/Zustand]
- **Styling:** Tailwind CSS

### 5.2 Mobile
- **Framework:** Expo SDK 54
- **Navigation:** React Navigation v7
- **State:** React Query
- **Storage:** [Secure Store/AsyncStorage]

### 5.3 Backend
- **Database:** Supabase PostgreSQL
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage (AWS S3)
- **Edge Functions:** [Gerekirse]

## 6. UI/UX Notları

### 6.1 Tasarım
- [ ] Mockup linki (Figma/Adobe XD)
- [ ] Design system referansı
- [ ] Responsive breakpoints

### 6.2 Etkileşimler
- [ ] Kullanıcı akışı
- [ ] Loading states
- [ ] Error states
- [ ] Empty states

### 6.3 Animasyonlar
- [ ] Geçiş animasyonları
- [ ] Loading animasyonları
- [ ] Micro-interactions

## 7. Story Mapping

### Story 1: [Başlık]
- **ID:** STORY-001
- **Priority:** P0
- **Points:** [1/2/3/5/8/13]
- **Platform:** [Web/Mobile/Both]
- **Bağımlılıklar:** [Yok/STORY-XXX]

**Açıklama:**
[Story detayı]

**Acceptance Criteria:**
- [ ] AC1: [Kriter]
- [ ] AC2: [Kriter]
- [ ] AC3: [Kriter]

**Teknik Notlar:**
- **Web:** `tikprofil-v2/src/app/[path]/`
- **Mobile:** `apps/tikprofil-mobile/screens/`
- **API:** `packages/shared-api/src/`
- **DB:** Migration gerekli mi?

### Story 2: [Başlık]
- **ID:** STORY-002
...

## 8. Riskler & Bağımlılıklar

| Risk | Olasılık | Etki | Önlem |
|------|----------|------|-------|
| [Risk] | Düşük/Orta/Yüksek | Düşük/Orta/Yüksek | [Önlem] |

## 9. Çıktılar

- [ ] PRD Onayı
- [ ] UI Mockup'ları
- [ ] Tech Spec (Level 2+)
- [ ] Story'ler oluşturuldu
