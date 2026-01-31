## Proje Kurulum ve Başlatma Adımları

### 1. Bağımlılıkları Yükle
- `npm install` komutunu çalıştırarak tüm Node.js paketlerini yükle
- Bu adım birkaç dakika sürebilir

### 2. Ortam Değişkenlerini Kontrol Et
- `.env.local` dosyasının varlığını ve dolu olduğunu kontrol et
- Supabase URL ve anahtarlarının ayarlanıp ayarlanmadığını doğrula

### 3. Geliştirme Sunucusunu Başlat
- `npm run dev` komutunu çalıştır
- Sunucunun localhost:3000'de başlatılmasını bekle
- Turbopack ile hızlı build ve hot-reload aktif olacak

### 4. Uygulamayı Tarayıcıda Aç
- Sunucu hazır olduğunda http://localhost:3000 adresini tarayıcıda aç
- Uygulamanın düzgün çalıştığını doğrula

### Beklenen Sonuç
- Next.js dev sunucusu localhost:3000'de çalışıyor olacak
- Hot-reload özelliği ile kod değişiklikleri otomatik yansıtılacak
- Supabase bağlantısı (eğer ortam değişkenleri doğruysa) aktif olacak