# Document Store Pattern'a Geçiş Planı

## Hedef
FastFood ve Hotel modüllerini SQL Schema'dan Document Store Pattern'a geçirerek tüm modülleri tutarlı hale getirmek.

## Yapılacak İşlemler

### 1. FastFood Modülünü Document Store'a Geçir
- API endpoint'leri güncelle (Document Store helper fonksiyonlarını kullan)
- Collection isimlerini standardize et:
  - `ff_products` → `fastfood_products`
  - `ff_categories` → `fastfood_categories`
  - `ff_orders` → `fastfood_orders`
  - `ff_coupons` → `fastfood_coupons`
  - `ff_tables` → `fastfood_tables`
  - `ff_settings` → `fastfood_settings`
  - `ff_campaigns` → `fastfood_campaigns`

### 2. Hotel Modülünü Document Store'a Geçir
- API endpoint'leri güncelle (Document Store helper fonksiyonlarını kullan)
- Collection isimlerini standardize et:
  - `hotel_room_types` → `hotel_room_types`
  - `hotel_rooms` → `hotel_rooms`
  - `hotel_reservations` → `hotel_reservations`
  - `hotel_settings` → `hotel_settings`
  - `hotel_housekeeping` → `hotel_housekeeping`

### 3. Legacy SQL Schema Dosyalarını Temizle
- `fastfood_schema.sql` → `fastfood_schema.legacy.sql` (yedek)
- `hotel_schema.sql` → `hotel_schema.legacy.sql` (yedek)

### 4. Tüm Modülleri Test Et
- API endpoint'leri test et
- Frontend sayfalarını test et
- Veri akışını doğrula

## Beklenen Sonuç
- ✅ Tüm modüller Document Store Pattern kullanacak
- ✅ Tek bir `app_documents` tablosu üzerinden tüm veri yönetimi
- ✅ Tutarlı API yapısı
- ✅ Kolay migration ve maintenance