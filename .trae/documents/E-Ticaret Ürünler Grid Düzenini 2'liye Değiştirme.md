# Public E-Ticaret Ürün Grid Düzenini 2'liye Değiştirme Planı

## 🎯 Hedef
Public e-ticaret sayfasındaki ürün grid yapısını 3'lüden 2'liye değiştirmek.

## 📋 Görev

### 1. Grid Yapısını Güncelle
**Dosya:** `src/components/public/EcommerceSheet.tsx`

**Satır 327'deki değişiklik:**
```tsx
// Önce (3'lü grid)
<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">

// Sonra (2'li grid)
<div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
```

## 📱 Sonuç

- **Mobil (default):** 2 sütun (önceden 2 sütun)
- **Small (sm):** 2 sütun (önceden 3 sütun)

## ✅ Test Planı

1. Sheet açıldığında ürünlerin 2 sütunlu olarak görüntülendiğini doğrula
2. Responsive tasarımı kontrol et (mobil ve masaüstü)
3. Hiçbir stil bozulması olmadığından emin ol