# 🚀 Cloudflare R2 Storage - Kod Entegrasyon Planı

## 📋 Mevcut Durum

✅ **Cloudflare R2 Setup Tamamlandı:**
- Custom domain: `cdn.tikprofil.com`
- Bucket name: `tik-profil`
- Access Key ID: `9458d263915d17c087fc24e723224515`
- Account ID: `6072b3e50ada6e75c9a73cd3ff584644`
- Public access: Aktif

---

## 🎯 Migrasyon Planı

### Phase 1: Dependencies Kurulumu

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

---

### Phase 2: R2 Storage Utility Oluşturma

**Yeni Dosya:** `src/lib/r2Storage.ts`

- R2 S3 client initialization
- `uploadToR2()` fonksiyonu
- `deleteFromR2()` fonksiyonu
- `getPresignedUrl()` fonksiyonu (opsiyonel)

---

### Phase 3: Environment Variables Ekleme

**Dosya:** `.env.local`

```env
# Cloudflare R2 Configuration
CLOUDFLARE_R2_ACCOUNT_ID=6072b3e50ada6e75c9a73cd3ff584644
CLOUDFLARE_R2_ACCESS_KEY_ID=9458d263915d17c087fc24e723224515
CLOUDFLARE_R2_SECRET_ACCESS_KEY=eadf2edc04d5f0592885619892ba7d1f9203dde86bf4e76cbbea3f00d5c2f4c6
CLOUDFLARE_R2_BUCKET_NAME=tik-profil
CLOUDFLARE_R2_PUBLIC_URL=https://cdn.tikprofil.com
```

---

### Phase 4: Upload Endpoint'leri Refactor

**Değiştirilecek Dosyalar:**

1. **`src/app/api/fastfood/upload/route.ts`**
   - Firebase Storage → R2 Storage
   - File size limit: 5MB → 10MB

2. **`src/app/api/ecommerce/upload/route.ts`**
   - Firebase Storage → R2 Storage

3. **Diğer Upload Endpoint'leri (varsa):**
   - `/api/emlak/upload`
   - `/api/beauty/upload`
   - `/api/hotel/upload`
   - `/api/food/upload`

---

### Phase 5: Base64 Storage Kaldırma

**Dosya:** `src/lib/storage.ts` → Refactor edilecek

- Logo/Cover upload fonksiyonları R2'ye geçiş
- Base64 encoding kaldırma
- Image resize koru (200x200 logo, 800x400 cover)

---

### Phase 6: Profile Page Refactor

**Dosya:** `src/app/panel/profile/page.tsx`

- Import güncelleme
- Upload fonksiyonları R2'ye yönlendirme

---

### Phase 7: Eski Firebase Storage Kodları Temizliği

**Silinecek/Kaldırılacak:**
- `src/lib/uploadUtils.ts` (Firebase REST API upload)
- Firebase Storage SDK referansları (kullanılmıyorsa)

---

### Phase 8: Test & Validation

1. **FastFood upload test**
   - Product image yükle
   - URL kontrol: `https://cdn.tikprofil.com/fastfood/...`

2. **Ecommerce upload test**
   - Product image yükle
   - URL kontrol

3. **Profile logo/cover test**
   - Logo yükle (200x200)
   - Cover yükle (800x400)

---

## 📦 Uygulama Sırası

1. ✅ npm install
2. ✅ .env.local güncelle
3. ✅ r2Storage.ts oluştur
4. ✅ FastFood upload refactor
5. ✅ Ecommerce upload refactor
6. ✅ storage.ts refactor
7. ✅ Profile page refactor
8. ✅ Test et

---

## ⚠️ Önemli Notlar

- Firebase Storage bucket'ı silmeye gerek yok (fallback olarak kalsın)
- Migration script daha sonra yapılacak (eski resimler için)
- File size limit artırıldı (5MB → 10MB)
- Image formatları: JPG, PNG, WebP, GIF desteklenecek

---

**Onaylayın, ardından kod entegrasyonuna başlayacağım!**