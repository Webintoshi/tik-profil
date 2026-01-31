## /panel/hotel/requests Sayfası - Beyaz Tema Güncellemeleri

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
- **Pending Count Badge**: `bg-yellow-100` → `bg-yellow-100` (beyaz), `dark:bg-yellow-900/30` (dark)
- **Filter Butonları**: Dinamik tema desteği ekle
- **Empty State**: İkon ve metin renklerini güncelle
- **Request Kartları**: Border, background ve text renklerini dinamik yap
- **Butonlar**: Cancel ve Complete butonları için tema uyumlu stiller

### 4. Tasarım İyileştirmeleri
- `py-2` → `py-3.5` ile daha büyük butonlar
- `rounded-xl` → `rounded-3xl` modal ve kart köşeleri (uygun yerlerde)
- `rounded-lg` → `rounded-xl` action butonları
- Food menu ve rooms sayfasıyla tutarlı stil