# PRD: Premium Analytics Dashboard

## 1. Genel Bakış

| Alan | Değer |
|------|-------|
| **Feature** | Premium Analytics Dashboard |
| **TikProfil Modülü** | Analytics |
| **Platform** | Both (Web + Mobile) |
| **Seviye** | 2 |
| **Tahmini Süre** | 1.5 hafta |
| **Priority** | P0 |

## 2. Problem & Çözüm

### 2.1 Problem

Kullanıcılar TikTok profillerinin detaylı analizlerine erişemiyor. Mevcut özet bilgiler yeterli değil.

### 2.2 Çözüm

Premium kullanıcılar için gelişmiş analytics dashboard:

- Takipçi büyüme grafiği
- İçerik performans analizi
- Engagement rate trendleri
- Karşılaştırmalı analizler

### 2.3 Başarı Kriterleri

- [ ] Premium kullanıcıların %80'i dashboard'u kullanıyor
- [ ] Günlük aktif kullanım süresinde %30 artış
- [ ] Kullanıcı memnuniyetinde artış

## 3. Kullanıcı Hikayeleri

- [ ] Bir **içerik üreticisi** olarak **takipçi büyümemi** görmek istiyorum çünkü **stratejimi optimize etmek istiyorum**
- [ ] Bir **işletme sahibi** olarak **en iyi performanslı içeriklerimi** görmek istiyorum çünkü **daha etkili içerik üretmek istiyorum**
- [ ] Bir **influencer** olarak **engagement trend'lerimi** görmek istiyorum çünkü **sponsorluk görüşmelerinde kullanacağım**

## 4. Fonksiyonel Gereksinimler

### 4.1 Web Gereksinimleri

| ID | Gereksinim | Öncelik |
|----|------------|---------|
| FR-W1 | /panel/analytics sayfası | P0 |
| FR-W2 | Takipçi büyüme grafiği (7/30/90 gün) | P0 |
| FR-W3 | Video performans tablosu | P0 |
| FR-W4 | Engagement rate widget | P1 |
| FR-W5 | PDF export | P2 |

### 4.2 Mobile Gereksinimleri

| ID | Gereksinim | Öncelik |
|----|------------|---------|
| FR-M1 | Analytics tab | P0 |
| FR-M2 | Takipçi grafiği (touch gestures) | P0 |
| FR-M3 | Video performans listesi | P0 |
| FR-M4 | Push notification (milestone) | P2 |

### 4.3 API Gereksinimleri

| ID | Endpoint/Fonksiyon | Açıklama |
|----|-------------------|----------|
| API-1 | getFollowerGrowth(userId, period) | Takipçi büyüme verisi |
| API-2 | getVideoPerformance(userId, limit) | Video performans verisi |
| API-3 | getEngagementRate(userId) | Engagement rate hesaplama |

## 5. Teknik Gereksinimler

### 5.1 Web

- **Framework:** Next.js 15 App Router
- **Rendering:** SSR + Client hydration
- **Charts:** Recharts veya Chart.js
- **State Management:** SWR

### 5.2 Mobile

- **Framework:** Expo SDK 54
- **Charts:** react-native-chart-kit
- **Gestures:** react-native-gesture-handler

### 5.3 Backend

- **Database:** Supabase PostgreSQL
- **Cache:** Redis (opsiyonel)
- **Cron:** Analytics data güncellemesi

## 6. UI/UX Notları

### 6.1 Tasarım

- [ ] Modern dark theme
- [ ] Gradient accent renkleri
- [ ] Responsive (mobile-first)

### 6.2 Etkileşimler

- [ ] Grafik zoom/pan
- [ ] Tarih aralığı seçimi
- [ ] Video detay modal

### 6.3 Animasyonlar

- [ ] Grafik giriş animasyonu
- [ ] Counter animasyonları
- [ ] Skeleton loaders

## 7. Story Mapping

### Story 1: Analytics API Layer

- **ID:** STORY-001
- **Priority:** P0
- **Points:** 5
- **Platform:** Backend (shared-api)
- **Bağımlılıklar:** Yok

**Açıklama:**
Analytics verilerini çeken shared-api fonksiyonlarını oluştur.

**Acceptance Criteria:**

- [ ] AC1: getFollowerGrowth çalışıyor
- [ ] AC2: getVideoPerformance çalışıyor
- [ ] AC3: getEngagementRate çalışıyor
- [ ] AC4: Error handling mevcut

**Teknik Notlar:**

- **API:** `packages/shared-api/src/analytics.ts`
- **Types:** `packages/shared-types/src/analytics.ts`

---

### Story 2: Web Analytics Dashboard

- **ID:** STORY-002
- **Priority:** P0
- **Points:** 8
- **Platform:** Web
- **Bağımlılıklar:** STORY-001

**Açıklama:**
Web için analytics dashboard sayfasını oluştur.

**Acceptance Criteria:**

- [ ] AC1: /panel/analytics sayfası çalışıyor
- [ ] AC2: Takipçi grafiği gösteriliyor
- [ ] AC3: Video performans tablosu çalışıyor
- [ ] AC4: Responsive tasarım

**Teknik Notlar:**

- **Web:** `tikprofil-v2/src/app/panel/analytics/page.tsx`
- **Components:** `tikprofil-v2/src/components/analytics/`

---

### Story 3: Mobile Analytics Screen

- **ID:** STORY-003
- **Priority:** P0
- **Points:** 8
- **Platform:** Mobile
- **Bağımlılıklar:** STORY-001

**Açıklama:**
Mobile için analytics ekranını oluştur.

**Acceptance Criteria:**

- [ ] AC1: Analytics tab çalışıyor
- [ ] AC2: Grafikler touch-friendly
- [ ] AC3: Smooth scrolling
- [ ] AC4: iOS ve Android uyumlu

**Teknik Notlar:**

- **Screen:** `apps/tikprofil-mobile/screens/AnalyticsScreen.tsx`
- **Components:** `apps/tikprofil-mobile/components/analytics/`

## 8. Riskler & Bağımlılıklar

| Risk | Olasılık | Etki | Önlem |
|------|----------|------|-------|
| TikTok API rate limit | Orta | Yüksek | Caching stratejisi |
| Chart library performance | Düşük | Orta | Virtualized rendering |
| Mobile chart gestures | Orta | Düşük | Fallback controls |

## 9. Çıktılar

- [x] PRD Onayı
- [ ] UI Mockup'ları
- [ ] Tech Spec
- [ ] Story'ler oluşturuldu

---

**Hazırlayan:** TikProfil PM
**Tarih:** 2026-02-01
**Versiyon:** 1.0
