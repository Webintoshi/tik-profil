# E-Commerce Modülü Eksiklikleri Düzeltme Planı

## 🎯 Hedef
E-Commerce modülündeki tüm eksiklikleri gidermek, sistemi bozmadan güvenli bir şekilde tamamlamak.

## 📋 Görevler

### 1. Dashboard İstatistikleri API'si Oluşturma (YENİ DOSYA)
**Dosya:** `src/app/api/ecommerce/dashboard/route.ts`

İçeriği:
- `GET` endpoint: Dashboard için özet istatistikleri döndürür
- Gereken istatistikler:
  - `totalProducts`: Toplam aktif ürün sayısı
  - `totalOrders`: Toplam sipariş sayısı
  - `totalCustomers`: Toplam müşteri sayısı
  - `todaySales`: Bugünkü satış tutarı (bugün oluşturulan siparişlerin toplamı)
  - `pendingOrders`: Bekleyen sipariş sayısı
  - `lowStockProducts`: Düşük stoklu ürün sayısı (stok <= 5)

---

### 2. Dashboard Sayfasını Güncelleme
**Dosya:** `src/app/panel/ecommerce/page.tsx`

Değişiklikler:
- `fetchStats()` fonksiyonunda placeholder verileri kaldır
- Yeni `/api/ecommerce/dashboard?businessId=${session.businessId}` endpoint'ini çağır
- API'den gelen verileri `stats` state'ine ata
- Hata durumunda 0 değerlerini koru (fallback)

---

### 3. Kupon İndirim Hesaplama
**Dosya:** `src/app/api/ecommerce/orders/route.ts`

Değişiklikler:
- `POST` fonksiyonunda `couponCode` parametresi varsa:
  - Kupon validation API'sini çağır: `/api/ecommerce/coupons?businessId=${businessId}&code=${couponCode}&orderAmount=${subtotal}`
  - Eğer kupon geçerliyse (`valid: true`), `discount` değerini API'den gelen değere ayarla
  - `total` hesaplamasında `discount`'u kullan: `total = subtotal + (shippingCost || 0) - discount`
- Kupon kullanıldıysa, kuponun `usageCount` değerini 1 artır

---

### 4. Kategori Silme Kontrolü
**Dosya:** `src/app/api/ecommerce/categories/route.ts`

Değişiklikler:
- `DELETE` fonksiyonunda silmeden önce:
  - `ecommerce_products` collection'ında bu kategoriye ait ürünleri kontrol et
  - Eğer ürün varsa, hata döndür: `'Bu kategoride ürün var, önce ürünleri taşıyın veya silin'`
  - Ürün yoksa, silme işlemini gerçekleştir

---

## 🔒 Güvenlik Kontrolleri

1. **Business ID Kontrolü**: Tüm endpoint'lerde `businessId` parametresi zorunlu
2. **Yetkilendirme**: Session kontrolü yapılacak (`useBusinessSession` hook kullanılıyor)
3. **Validasyon**: Giriş verileri zaten Zod ile doğrulanıyor
4. **Hata Yönetimi**: Tüm try-catch blokları korunacak
5. **Fallback Değerler**: API hatası durumunda 0 değerleri kullanılacak

---

## 📝 Kod Konvansiyonları

- Response format: `{ success: true, data }` / `{ success: false, code, message }`
- DB: snake_case, UI: camelCase (documentStore kullanıldığı için camelCase)
- Tarihler: `new Date().toISOString()`
- Loglama: `console.error` ile hata mesajları

---

## ✅ Test Planı

1. Dashboard istatistiklerinin doğru görüntülendiğini kontrol et
2. Bugünkü satışların doğru hesaplandığını doğrula
3. Kupon kodu ile sipariş oluşturup indirim hesaplandığını test et
4. Ürünleri olan bir kategoriyi silmeyi dene, hata almalısın
5. Boş bir kategoriyi silmeyi dene, başarılı olmalı

---

## 🚀 Uygulama Sırası

1. Dashboard API'si oluştur
2. Dashboard sayfasını güncelle
3. Kupon indirim hesaplamayı ekle
4. Kategori silme kontrolünü ekle
5. Tüm değişiklikleri test et