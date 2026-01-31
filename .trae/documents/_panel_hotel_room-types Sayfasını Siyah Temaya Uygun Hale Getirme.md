## /panel/hotel/room-types Sayfası - Siyah Tema Güncellemeleri

### 1. Import Ekleme

* `useTheme` hook'u ve `clsx` utility'si ekle

* ThemeProvider ile dinamik tema desteği sağla

### 2. Tema Renk Değişkenleri Tanımlama

* `cardBg`: beyaz → `bg-white`, dark → `bg-[#111]`

* `borderColor`: beyaz → `border-slate-200/60`, dark → `border-[#222]`

* `textPrimary`: beyaz → `text-slate-900`, dark → `text-white`

* `textSecondary`: beyaz → `text-slate-500`, dark → `text-gray-400`

* `inputBg`: beyaz → `bg-slate-50`, dark → `bg-[#0a0a0a] border-[#222]`

### 3. Bileşen Güncellemeleri

* **Header**: Başlık, açıklama ve buton renkleri

* **Empty State**: İkon ve metin renkleri

* **Room Type Kartları**:

  * Background, border ve text renkleri dinamik

  * Hover overlay renkleri

  * Price, capacity, size, bed type bilgileri

  * Amenity badge'leri

* **Modal**:

  * Form label'ları

  * Input, textarea ve select elementleri

  * Amenity seçim butonları

  * Photo upload area

  * Footer butonları

### 4. Tasarım İyileştirmeleri

* `text-slate-` renklerini dinamik tema desteği ile güncelle

* `bg-slate-900` butonları dinamik yap (dark için `bg-slate-900`, light için farklı)

* Diğer hotel sayfalarıyla tutarlı stil

