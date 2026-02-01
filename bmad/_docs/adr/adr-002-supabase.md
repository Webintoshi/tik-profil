# ADR-002: Database Provider Seçimi

## Durum

**Kabul Edildi** - 2026-01-15

## Bağlam

TikProfil için backend altyapısı seçilmesi gerekiyordu. Kriterler:

- Hızlı geliştirme
- Ölçeklenebilirlik
- Auth entegrasyonu
- Real-time özellikler
- Storage çözümü
- Maliyet etkinliği

## Karar

**Supabase** seçildi.

**Kullanılan Özellikler:**

- PostgreSQL database
- Supabase Auth
- Row Level Security (RLS)
- Supabase Storage (AWS S3)
- Edge Functions (isteğe bağlı)

## Alternatifler

### Alternatif 1: Firebase

- **Artılar:** Olgun ekosistem, kolay başlangıç
- **Eksiler:** NoSQL (ilişkisel veri için zor), vendor lock-in
- **Karar:** Reddedildi - SQL ihtiyacı

### Alternatif 2: AWS Amplify

- **Artılar:** Tam AWS entegrasyonu, ölçeklenebilir
- **Eksiler:** Karmaşık setup, yüksek öğrenme eğrisi
- **Karar:** Reddedildi - Hız önceliği

### Alternatif 3: PlanetScale + Auth0

- **Artılar:** MySQL, güçlü branching
- **Eksiler:** Parçalı çözüm, entegrasyon çalışması
- **Karar:** Reddedildi - All-in-one tercih

## Sonuçlar

### Artılar

- ✅ PostgreSQL gücü (JOINs, transactions)
- ✅ Built-in Auth
- ✅ RLS ile güvenlik
- ✅ Real-time subscriptions
- ✅ Open source alt yapı

### Eksiler

- ⚠️ Firebase kadar olgun değil
- ⚠️ Bazı edge case'lerde dokümantasyon eksik
- ⚠️ Self-host karmaşık olabilir

## Implementasyon Detayları

### Client Setup

```typescript
// tikprofil-v2/src/lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

### RLS Policy Örneği

```sql
-- Users can only see their own data
CREATE POLICY "Users can view own data"
ON profiles FOR SELECT
USING (auth.uid() = user_id);
```

### Migration Yapısı

```
tikprofil-v2/supabase/
├── migrations/
│   ├── 20260115_initial.sql
│   ├── 20260120_analytics.sql
│   └── 20260125_payments.sql
└── seed.sql
```

## Referanslar

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

**Karar Verici:** TikProfil Development Team
**Tarih:** 2026-01-15
