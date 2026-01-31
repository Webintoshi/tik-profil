## /panel/hotel/analytics Sayfası - Beyaz Tema Güncellemeleri

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
- **Main Stats Kartları**: 4 adet istatistik kartı
  - Toplam Oda (mavi)
  - Doluluk Oranı (yeşil)
  - Toplam Talep (mor)
  - Bekleyen Talep (sarı)
- **Oda Durumları**: Progress bar'lar ve metinler
- **Info Box**: Bilgi kutusu rengi

### 4. Tasarım İyileştirmeleri
- `p-5` → `p-4 md:p-5` ile responsive padding
- Icon konteynerleri için daha modern stiller
- Progress bar'lar için dinamik renkler
- Food menu, requests, orders ve rooms sayfasıyla tutarlı stil