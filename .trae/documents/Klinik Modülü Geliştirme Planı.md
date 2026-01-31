# TikProfil Klinik Modülü Geliştirme Planı

## Adım 1: SQL Schema Oluştur
- `supabase/clinic_schema.sql` dosyasını oluştur
- 10 tablo: categories, services, appointments, patients, staff, products, reviews, notifications, analytics, insurance, billing, settings
- Supabase SQL Editor'ünde çalıştır

## Adım 2: Admin API'leri Oluştur
- `/api/clinic/services` - Hizmetler CRUD
- `/api/clinic/appointments` - Randevular CRUD + Durum güncelleme
- `/api/clinic/patients` - Hastalar CRUD + Geçmiş
- `/api/clinic/staff` - Personel CRUD + Çalışma saatleri
- `/api/clinic/categories` - Kategoriler CRUD
- `/api/clinic/settings` - Ayarlar CRUD
- `/api/clinic/analytics` - İstatistikler GET (aylık, yıllık)
- `/api/clinic/billing` - Faturalama CRUD
- `/api/clinic/reviews` - Yorumlar yönetimi (onay/publish)

## Adım 3: Public API'leri Oluştur
- `/api/clinic/public-services` - Hizmetler (public)
- `/api/clinic/public-staff` - Personel (public)
- `/api/clinic/public-appointments` - Randevu oluşturma (public)
- `/api/clinic/public-categories` - Kategoriler (public)

## Adım 4: Dashboard Paneli Oluştur
- Dashboard (istatistikler, grafikler)
- Hasta listesi (arama, filtreleme)
- Randevu takvimi (drag & drop)
- Personel yönetimi
- Finans raporları
- Ayarlar menüsü

## Adım 5: TikProfil Entegrasyonu
- Public profilde "Randevu Al" mor butonu ekle
- Butona tıklandığında klinik modülünün public endpoint'ini çağır
- Otomatik randevu oluşturma
- TikProfil session'ı ile entegre çalışma

## Özellikler:
✅ Hasta Takip Sistemi
✅ Randevu Yönetimi
✅ Hizmet/Tedavi Yönetimi
✅ Personel Yönetimi
✅ Muhasebe/Faturalama
✅ Hasta Portalı
✅ E-posta Bildirimleri
✅ İstatistik ve Grafikler
✅ Hasta Yorumları
✅ Stok Yönetimi
✅ Public Profilde Mor Buton Entegrasyonu