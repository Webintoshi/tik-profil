# Fastfood Modülü - Eksikleri Tamamlama Planı

## 📋 Tespit Edilen Eksikler

### 1. Checkout API Eksik
- `api/fastfood/checkout/route.ts` dosyası yok
- Müşteri sepetinden sipariş oluşturamıyor
- Sepetteki verileri `CartContext` ile tutuyor ama checkout yok

### 2. Sipariş Tamamlama UI Eksik
- Müşteri menü sayfasında (`/[slug]/menu/page.tsx`) sepet var ama checkout formu yok
- Teslimat adresi, ödeme yöntemi, not alanları yok
- Kupon uygulama var ama sipariş oluşturma yok

### 3. Sipariş Takibi Eksik
- Müşteriler sipariş durumunu göremiyor
- Sipariş geçmişi yok
- `/[slug]/siparis/page.tsx` sadece basit ürün listesi, gerçek sipariş takibi değil

### 4. Real-time Updates Eksik (Gecikme Nedeni)
- Ürün eklendiğinde müşteri tarafında otomatik refresh yok
- WebSocket/polling yok
- Firestore eventual consistency + no cache var ama 4-5s gecikme normal
- `cache: 'no-store'` var ama yine de gecikme oluyor

### 5. Ödeme Entegrasyonu Eksik
- Iyzico/Stripe gibi ödeme sağlayıcısı yok
- Sadece nakit/kredi kartı seçimi var ama işlem yok

### 6. Bildirim Sistemi Eksik
- SMS/Email bildirim yok
- Sipariş durum değişikliğinde müşteriye bildirim gitmiyor

---

## 🎯 Uygulama Planı

### Aşama 1: Checkout API Oluştur
**Dosya**: `src/app/api/fastfood/checkout/route.ts`

```typescript
// POST - Sipariş oluştur
- Validasyon (Zod)
- Sepet doğrulama
- Kupon kontrolü ve uygulama
- Teslimat ücreti hesaplama
- Firestore'a sipariş kaydı (ff_orders)
- Kupon kullanım kaydı (ff_coupon_usages)
- İşletmeye bildirim (notify API)
```

### Aşama 2: Checkout UI Oluştur
**Dosya**: `src/components/public/menu/CheckoutSheet.tsx`

```tsx
// Checkout form component
- Müşteri bilgileri (ad, telefon)
- Teslimat adresi / Masa seçimi
- Ödeme yöntemi (nakit, kredi kartı)
- Kupon input ve doğrulama
- Sipariş notu
- Toplam tutar gösterimi
- Sipariş butonu
```

**Güncellenecek Dosya**: `src/app/(public)/[slug]/menu/page.tsx`
- `CheckoutSheet` ekle
- Sepetten checkout'a geçiş

### Aşama 3: Sipariş Takibi Sayfası
**Dosya**: `src/app/(public)/[slug]/siparisler/page.tsx`

```tsx
// Sipariş geçmişi ve takibi
- Telefon ile giriş (basit auth)
- Aktif siparişler (durum gösterimi)
- Tamamlanmış siparişler
- Sipariş detayı
- Geri bildirim (opsiyonel)
```

**API**: `src/app/api/fastfood/customer-orders/route.ts`
- Müşteri siparişlerini getir
- Sipariş detayı getir

### Aşama 4: Real-time Updates (Gecikme Çözümü)
**Yöntem 1: Polling (Basit)**
```tsx
// Menu sayfasına interval ekle
useEffect(() => {
  const interval = setInterval(() => {
    fetchMenuData();
  }, 10000); // 10 saniyede bir
  return () => clearInterval(interval);
}, [slug]);
```

**Yöntem 2: Optimistic UI (Daha iyi)**
- Panel'de ürün ekleme başarılı olduğunda state'i güncelle
- `loadData()` çağrısı sonrası optimistic update

### Aşama 5: Geliştirmeler (Opsiyonel - İstek Olursa)
- Ödeme entegrasyonu (Iyzico)
- SMS/Email bildirim
- Müşteri yorumları
- Favoriler

---

## 📁 Oluşturulacak/Düzenlenecek Dosyalar

### Yeni Dosyalar:
1. `src/app/api/fastfood/checkout/route.ts`
2. `src/components/public/menu/CheckoutSheet.tsx`
3. `src/app/api/fastfood/customer-orders/route.ts`
4. `src/app/(public)/[slug]/siparisler/page.tsx`

### Düzenlenecek Dosyalar:
1. `src/app/(public)/[slug]/menu/page.tsx` (CheckoutSheet entegrasyonu)
2. `src/app/panel/fastfood/orders/page.tsx` (Optimistic update - isteğe bağlı)

---

## ⚠️ Önemli Notlar

1. **Modüler İzolasyon**: Tüm değişiklikler sadece fastfood modülünü etkileyecek
2. **API Validation**: Zod ile validasyon zorunlu
3. **Firestore Consistency**: Eventual consistency'i kabul et, optimistic UI ile gider
4. **Cache**: `cache: 'no-store'` zaten var, ekstra cache yok
5. **Rollback**: Git ile kolay rollback

---

## ✅ Akış

1. Checkout API oluştur ve test et
2. CheckoutSheet component oluştur
3. Menu sayfasına checkout ekle
4. Sipariş takibi sayfası oluştur
5. Real-time polling ekle (veya optimistic UI)
6. Manuel test

---

**Toplam Değişiklik**: ~4 yeni dosya + 2 düzenleme