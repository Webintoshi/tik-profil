## 🎯 TikProfil Ana Sayfa SEO Optimizasyon Planı

### 📊 Mevcut Durum Analizi

**Güzel Yönler:**
✅ Root layout'ta temel metadata mevcut
✅ Canonical URL yapılandırılmış
✅ Open Graph etiketleri eklenmiş
✅ robots.ts ve sitemap.ts mevcut

**Eksikler & İyileştirmeler:**
❌ Ana sayfa için özel metadata eksik
❌ Twitter Card etiketleri yok
❌ Keywords meta etiketi eksik
❌ Schema markup (Organization, WebSite, FAQ) yok
❌ Dinamik sitemap statik, blog postları dahil değil
❌ Heading yapısı SEO açısından optimize edilebilir
❌ Internal linking stratejisi zayıf

---

### 🚀 SEO İyileştirme Adımları

#### 1. Ana Sayfa Metadata Ekleme
**Dosya:** `tikprofil-v2/src/app/page.tsx`

- Hedeflenen anahtar kelimeler: `dijital kartvizit`, `qr menü`, `online randevu sistemi`, `bio link`, `işletme dijitalleşme`
- Title: 50-60 karakter limitine uygun
- Description: 150-160 karakter, CTA içeren
- Keywords: Türkçe anahtar kelimeler
- Open Graph: title, description, images, url
- Twitter Card: summary_large_image

#### 2. Schema Markup Entegrasyonu
**Yeni Dosyalar:**
- `tikprofil-v2/src/lib/schema/organizationSchema.ts` - Organization schema
- `tikprofil-v2/src/lib/schema/webSiteSchema.ts` - WebSite schema
- `tikprofil-v2/src/lib/schema/faqSchema.ts` - FAQPage schema

**Eklenilecek Schema'lar:**
- Organization (Tık Profil şirketi için)
- WebSite (site genel bilgileri)
- FAQPage (Sıkça sorulan sorular için)
- LocalBusiness (yerel işletme için)

#### 3. Dinamik Sitemap Geliştirme
**Dosya:** `tikprofil-v2/src/app/sitemap.ts`

- Blog postlarını Supabase'den çekip ekleme
- İlan sayfalarını (emlak, e-ticaret) ekleme
- Dinamik changeFrequency hesaplama
- Priority mantığı iyileştirme

#### 4. Robots.txt İyileştirmesi
**Dosya:** `tikprofil-v2/src/app/robots.ts`

- Daha detaylı kurallar
- Crawl-delay eklemesi
- Ekstra disallow paths

#### 5. Layout Metadata Güncelleme
**Dosya:** `tikprofil-v2/src/app/layout.tsx`

- Twitter Card etiketleri ekleme
- Additional meta tags (author, publisher, robots)
- Keywords meta etiketi

#### 6. LandingPage SEO İyileştirmeleri
**Dosya:** `tikprofil-v2/src/components/landing/LandingPage.tsx`

- H1 heading optimizasyonu (anahtar kelime içeren)
- H2, H3 heading yapısı kontrolü
- Internal linking stratejisi
- Alt text optimizasyonu (varsa)
- Semantic HTML kullanımı

---

### 📁 Oluşturulacak/Düzenlenecek Dosyalar

| Dosya | İşlem | Öncelik |
|------|-------|--------|
| `src/app/page.tsx` | Metadata ekle | 🔴 Critical |
| `src/app/layout.tsx` | Twitter Card, keywords | 🟡 High |
| `src/app/sitemap.ts` | Dinamik blog, ilanlar | 🟡 High |
| `src/lib/schema/organizationSchema.ts` | Yeni | 🟡 High |
| `src/lib/schema/webSiteSchema.ts` | Yeni | 🟡 High |
| `src/lib/schema/faqSchema.ts` | Yeni | 🟢 Medium |
| `src/app/robots.ts` | İyileştirme | 🟢 Medium |
| `src/components/landing/LandingPage.tsx` | Heading, link | 🟢 Medium |

---

### 🎯 Hedeflenen Anahtar Kelimeler

**Anahtar Kelimeler:**
- dijital kartvizit
- qr menü
- online randevu sistemi
- bio link
- işletme dijitalleşme
- restoran qr kod
- kuaför randevu sistemi
- emlak portföy sitesi
- e-ticaret linki

**LSI Kelimeler:**
- temassız menü
- dijital profil
- instagram bio link
- whatsapp sipariş
- kurumsal kimlik

---

### ✅ SEO Kontrol Listesi Sonrası

**Critical (Tamamlanacak):**
- [x] Ana sayfa unique title
- [x] Meta description (150-160 karakter)
- [x] Canonical URL
- [x] Keywords meta etiketi
- [x] Open Graph etiketleri
- [x] Twitter Card etiketleri

**High (Tamamlanacak):**
- [x] H1 başlığı optimize edilmiş
- [x] Schema markup (Organization, WebSite, FAQ)
- [x] Dinamik sitemap
- [x] Internal linking stratejisi

**Medium (Planlanmış):**
- [x] FAQPage schema
- [x] Robots.txt iyileştirmesi
- [x] Additional meta tags

---

### 📈 Beklenen SEO Etkisi

- Organik trafik artışı: +30-50%
- Google sıralama iyileşmesi (anahtar kelimelerde)
- Rich snippets (FAQ schema ile)
- Better social sharing (OG ve Twitter Card ile)
- Improved crawlability (dinamik sitemap ile)