## /panel/hotel/orders Sayfası - Beyaz Tema Güncellemeleri

### 1. Import Ekleme
- `useTheme` hook'u ve `clsx` utility'si ekle
- ThemeProvider ile dinamik tema desteği sağla

### 2. Tema Renk Değişkenleri Tanımlama
- `cardBg`: beyaz → `bg-white`, dark → `bg-[#111]`
- `borderColor`: beyaz → `border-gray-200`, dark → `border-[#222]`
- `textPrimary`: beyaz → `text-gray-900`, dark → `text-white`
- `textSecondary`: beyaz → `text-gray-600`, dark → `text-gray-400`

### 3. Bileşen Güncellemeleri
- **Header**: Başlık ve açıklama metinleri
- **Active Count Badge**: `bg-orange-100` → `bg-orange-100` (beyaz), `dark:bg-orange-900/30` (dark)
- **Filter Butonları**: Dinamik tema desteği ekle
- **Empty State**: İkon ve metin renklerini güncelle
- **Order Kartları**: 
  - Border, background ve text renklerini dinamik yap
  - Header bölümü: border ve text renkleri
  - Items bölümü: text renkleri
  - Actions bölümü: background butonları
- **Butonlar**: İptal, Hazırlanıyor ve Teslim Edildi butonları için tema uyumlu stiller

### 4. Tasarım İyileştirmeleri
- `py-2` → `py-2.5` ile daha büyük butonlar
- `py-2` → `py-3.5` action butonları için
- `rounded-lg` → `rounded-xl` icon konteynerleri
- `font-medium` → `font-semibold` daha belirgin metinler
- Food menu, requests ve rooms sayfasıyla tutarlı stil