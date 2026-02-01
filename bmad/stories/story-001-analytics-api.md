# STORY-001: Analytics API Layer

## Bilgiler

| Alan | Değer |
|------|-------|
| **Feature** | Premium Analytics Dashboard |
| **PRD** | [prd-premium-analytics.md](./prd-premium-analytics.md) |
| **Priority** | P0 |
| **Points** | 5 |
| **Platform** | Backend (shared-api) |
| **Assignee** | Full-Stack Dev |
| **Status** | Ready |

## Açıklama

Analytics verilerini çeken shared-api fonksiyonlarını oluştur. Bu story, diğer tüm analytics story'lerinin bağımlılığıdır.

Oluşturulacak fonksiyonlar:

1. `getFollowerGrowth(userId, period)` - Takipçi büyüme verisi
2. `getVideoPerformance(userId, limit)` - Video performans verisi  
3. `getEngagementRate(userId)` - Engagement rate hesaplama

## Teknik Detaylar

### Shared API

```typescript
// packages/shared-api/src/analytics.ts

export interface FollowerGrowthData {
  date: string;
  followers: number;
  change: number;
}

export interface VideoPerformanceData {
  videoId: string;
  title: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;
  publishedAt: string;
}

export interface EngagementRateData {
  current: number;
  previous: number;
  trend: 'up' | 'down' | 'stable';
  percentChange: number;
}

// Functions
export async function getFollowerGrowth(
  userId: string, 
  period: '7d' | '30d' | '90d'
): Promise<FollowerGrowthData[]>

export async function getVideoPerformance(
  userId: string, 
  limit: number = 10
): Promise<VideoPerformanceData[]>

export async function getEngagementRate(
  userId: string
): Promise<EngagementRateData>
```

### Shared Types

```typescript
// packages/shared-types/src/analytics.ts
// Type exports for web and mobile usage
```

### Database Query

```sql
-- tikprofil-v2/supabase/analytics_queries.sql

-- Follower growth query
SELECT date, followers, 
       followers - LAG(followers) OVER (ORDER BY date) as change
FROM follower_history
WHERE user_id = $1 AND date >= NOW() - INTERVAL $2
ORDER BY date;

-- Video performance query
SELECT * FROM video_analytics
WHERE user_id = $1
ORDER BY published_at DESC
LIMIT $2;
```

## Acceptance Criteria

- [ ] **AC1:** `getFollowerGrowth()` 7, 30, 90 günlük periyotlar için çalışıyor
- [ ] **AC2:** `getVideoPerformance()` video listesini döndürüyor
- [ ] **AC3:** `getEngagementRate()` trend hesaplıyor
- [ ] **AC4:** Tüm fonksiyonlar proper error handling içeriyor
- [ ] **AC5:** TypeScript types export ediliyor
- [ ] **AC6:** Unit testler yazıldı

## Test Senaryoları

- [ ] **TS1:** Valid userId ile veri döndürme
- [ ] **TS2:** Invalid userId ile error handling
- [ ] **TS3:** Empty data set handling
- [ ] **TS4:** Rate limit handling
- [ ] **TS5:** Network error handling

## Dosya Değişiklikleri

| Dosya | İşlem |
|-------|-------|
| `packages/shared-api/src/analytics.ts` | CREATE |
| `packages/shared-types/src/analytics.ts` | CREATE |
| `packages/shared-api/src/index.ts` | UPDATE (export) |
| `packages/shared-types/src/index.ts` | UPDATE (export) |
| `packages/shared-api/__tests__/analytics.test.ts` | CREATE |

## Bağımlılıklar

- **Depends On:** Yok (ilk story)
- **Blocks:** STORY-002, STORY-003

## Notlar

- Supabase client kullanılacak
- Cache için SWR/React Query kullanılabilir (client tarafında)
- API response formatı RESTful olmalı

---

**Created:** 2026-02-01
**Updated:** 2026-02-01
