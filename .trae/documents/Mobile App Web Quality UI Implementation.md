# 🎯 Mobil Uygulama Web Kalitesinde UI Implementasyon Planı

## 📋 Analiz Sonucu

Web sayfası (`/kesfet`) şu özelliklere sahip:
- ✅ **Stories Bar** (Instagram tarzı)
- ✅ **Business Types Bar** (Kategori filtreleri)
- ✅ **CityGuideSection** (Şehir rehberi - gerçek API)
- ✅ **Business Cards** (Glass morphism tasarım)
- ✅ **Search & Filter** (Arama ve filtreleme)
- ✅ **Location Modal** (Konum seçimi)
- ✅ **Bottom Navigation** (5 tab)

Mobil uygulamada şu an sadece basit HomeScreen var.

---

## 🚀 Implementasyon Adımları

### **Sprint 1: Core UI Components (Ana Ekran)**

#### 1. **HomeScreen'i Tamamen Yeniden Tasarla**
- Web sayfasıyla birebir kalitede UI
- Glass morphism efektleri
- Smooth animasyonlar (React Native Animated API)
- Proper spacing ve typography

#### 2. **StoriesBar Component Oluştur**
- Instagram stories tarzı yuvarlak avatarlar
- Gradient border (okunmamış stories için)
- Live badge animasyonu
- Horizontal scroll with snap
- **Veri Kaynağı:** `/api/cities` endpoint'inden "featured businesses"
- **Yükleme:** Shimmer skeleton

#### 3. **BusinessTypesBar Component Oluştur**
- Kategori butonları (Tümü, Restoran, Cafe, Fast Food, vb.)
- Active state with gradient background
- Icon butonları
- Horizontal scroll
- **Veri Kaynağı:** Supabase `businesses` tablosu -> distinct `category`
- **State Management:** Seçili kategoriyi filter için kullan

#### 4. **CityGuideCard Component Oluştur**
- Şehir kapak görseli
- Gezilecek yerler (horizontal scroll cards)
- Parallax effect
- **Veri Kaynağı:** `/api/cities?name=${currentLocation}`
- **Loading:** Skeleton loading
- **Empty State:** "Şehir rehberi bulunamadı"

#### 5. **BusinessCard'i Yeniden Tasarla**
- Glass morphism background
- Cover image with gradient overlay
- Logo overlap (web'deki gibi)
- Rating badge (star icon)
- Distance badge (location icon)
- Like button with animation
- **Veri Kaynağı:** `getBusinesses()` API çağrısı
- **Filtreleme:** Seçili kategoriye göre filter

---

### **Sprint 2: Search & Filter (Arama ve Filtreleme)**

#### 6. **SearchBar Component Oluştur**
- Debounced search input (300ms)
- Filter button (modal açar)
- **API Integration:** `/api/kesfet/search?q=${query}`
- **Loading:** Search results loading indicator
- **Empty State:** "Sonuç bulunamadı"

#### 7. **FilterModal Component Oluştur**
- Kategori filtreleri (multi-select)
- Sıralama seçenekleri (distance, rating, newest)
- Konum filtreleri (nearby, city-wide)
- "Filtreleri Temizle" butonu
- **State Management:** Search params object

#### 8. **LocationModal Component Oluştur**
- GPS button ("Mevcut Konumu Kullan")
- Şehir listesi (İstanbul, Ankara, İzmir, vb.)
- Seçili konumu highlight et
- **GPS Integration:** `expo-location`
- **API Integration:** `https://nominatim.openstreetmap.org/reverse`

---

### **Sprint 3: Navigation & Polish**

#### 9. **TabNavigator'ı Güncelle**
- Web sayfasındaki 5 tab yapısını uygula:
  1. Ana Sayfa (Home)
  2. Keşfet (Explore) - **ACTIVE TAB**
  3. QR Code (Center button)
  4. Siparişler (Orders)
  5. Profil (Profile)
- Active tab indicator
- Icon animations

#### 10. **Ana Sayfa (Home) Screen Oluştur**
- Wallet card (bakiye, puanlar)
- Quick stats (Siparişler, Favoriler, Tasarruf)
- Recent orders list
- Promotions banner
- **Veri Kaynakları:**
  - `/api/kesfet/wallet`
  - `/api/kesfet/orders?limit=3`

#### 11. **Loading States Ekle**
- Shimmer skeleton components
- ActivityIndicator with custom design
- Error boundaries
- Retry mekanizması

#### 12. **Error Handling Güncelle**
- User-friendly error messages
- Network error detection
- Timeout handling
- Offline support detection

---

## 📁 Dosya Yapısı

```
apps/tikprofil-mobile/
├── screens/
│   ├── HomeScreen.tsx          ✅ Yeniden tasarla (Web quality)
│   ├── ExploreScreen.tsx       ✅ Oluştur (Search + Filter)
│   └── MainScreen.tsx          ✅ Oluştur (Wallet + Stats)
├── components/
│   ├── home/
│   │   ├── StoriesBar.tsx       🆕 Oluştur
│   │   ├── BusinessTypesBar.tsx 🆕 Oluştur
│   │   ├── CityGuideCard.tsx    🆕 Oluştur
│   │   ├── BusinessCard.tsx     🔄 Yeniden tasarla
│   │   ├── SearchBar.tsx        🆕 Oluştur
│   │   ├── FilterModal.tsx      🆕 Oluştur
│   │   ├── LocationModal.tsx    🆕 Oluştur
│   │   └── ShimmerSkeleton.tsx  🆕 Oluştur
│   └── common/
│       ├── GlassCard.tsx        🆕 Oluştur (Reusable)
│       └── GradientBadge.tsx    🆕 Oluştur (Reusable)
├── hooks/
│   ├── useBusinessSearch.ts     🆕 Oluştur
│   ├── useLocation.ts           🆕 Oluştur
│   └── useDebounce.ts           🆕 Oluştur
├── services/
│   ├── cityService.ts           🆕 Oluştur
│   └── locationService.ts       🆕 Oluştur
└── navigation/
    └── AppNavigator.tsx         🔄 Güncelle (5 tab)
```

---

## 🎨 Tasarım Prensipleri (Web Sayfasından)

1. **Glass Morphism:**
   - `backdrop-blur-xl`
   - `bg-white/10`
   - `border-white/20`
   - React Native: `blurView` from `@react-native-community/blur`

2. **Gradient Borders:**
   - `bg-gradient-to-br from-blue-500/90 to-cyan-500/90`
   - React Native: `LinearGradient` from `expo-linear-gradient`

3. **Shadow System:**
   - `shadow-xl shadow-blue-600/20`
   - React Native: `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`

4. **Animations:**
   - Web: Framer Motion
   - Mobile: React Native Animated API
   - Hover → `onPressIn` / `onPressOut`

---

## 🔌 API Entegrasyonları

| Component | API Endpoint | Veri |
|-----------|--------------|------|
| StoriesBar | `/api/cities` | Featured businesses |
| BusinessTypesBar | `getBusinesses()` | Distinct categories |
| CityGuideCard | `/api/cities?name=${city}` | City data + places |
| BusinessCard | `getBusinesses({ category, limit })` | Business list |
| SearchBar | `/api/kesfet/search?q=${query}` | Search results |
| Home/Wallet | `/api/kesfet/wallet` | Balance + points |
| Home/Orders | `/api/kesfet/orders?limit=3` | Recent orders |

---

## ⚠️ Kritik Kural

**SIFIR DEMO VERİ!** 🚫
- Tüm veriler gerçek API'lerden gelecek
- Loading states için shimmer kullan
- Empty states için user-friendly mesajlar
- Hiçbir hardcoded data olmayacak

---

## ⏱️ Tahmini Süre

- **Sprint 1:** 4-6 saat (Core UI)
- **Sprint 2:** 3-4 saat (Search & Filter)
- **Sprint 3:** 2-3 saat (Navigation & Polish)

**Toplam:** 9-13 saat (1.5-2 gün)

---

## ✅ Başarı Kriterleri

1. ✅ Web sayfasıyla %90+ UI benzerliği
2. ✅ Tüm veriler gerçek API'lerden
3. ✅ Smooth animasyonlar (60fps)
4. ✅ Loading ve error states
5. ✅ 5 tab navigation çalışıyor
6. ✅ Search ve filter fonksiyonel
7. ✅ Location (GPS) çalışıyor
8. ✅ Zero demo data

---

Başlamama izin verir misin? 🚀