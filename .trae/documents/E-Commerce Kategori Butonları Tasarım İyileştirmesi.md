# E-Commerce Kategori Butonları Tasarım İyileştirmesi

## Hedef
derycraft gibi 10+ kategorisi olan işletmelerde kategori butonlarının görsel tasarımını ve kullanılabilirliğini iyileştirmek.

## Dosya
- `src/components/public/EcommerceSheet.tsx` (satırlar 290-315)

## Yapılacak Değişiklikler

### 1. Kategori Container'ı Güncelle
- Scroll göstergeleri (sol/sağ oklar) ekle
- Group hover ile opaklık kontrolü
- Snap scroll için `snap-x snap-mandatory` sınıfları ekle

### 2. "Tümü" Butonu (Aktif Durum)
- `rounded-full` → `rounded-2xl` (daha modern)
- `bg-gray-900` → `bg-purple-600` (brand color)
- Border ve shadow ekle: `border-2 border-purple-600 shadow-lg shadow-purple-500/30`
- Padding artır: `py-2` → `py-2.5`

### 3. Kategori Butonları (İnaktif Durum)
- `rounded-full` → `rounded-2xl`
- `bg-gray-100` → `bg-gray-50`
- Border ekle: `border-2 border-transparent`
- Hover efekti iyileştir: `hover:bg-gray-100 hover:border-gray-300`
- Padding artır: `py-2` → `py-2.5`

### 4. Gerekli İkonlar
- `ChevronLeft` ve `ChevronRight` (lucide-react) import et

## Beklenen Sonuç
- Modern ve şık kategori butonları
- Scroll göstergeleri ile daha iyi UX
- Aktif kategori daha belirgin
- Touch target boyutu artmış
- Smooth scroll deneyimi