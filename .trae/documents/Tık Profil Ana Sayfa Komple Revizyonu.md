## 🎯 Ana Sayfa Revizyon Planı

### 1. QR World Hero Bölümü
- **Yeni Component**: `QRWorldAnimation.tsx` (canvas tabanlı)
  - 3D rotasyonlu QR kod outline
  - QR kodun içinde animasyonlu dünya küresi
  - Parçacık bağlantıları (world ↔ QR nodes)
  - Mouse hover tilt efekti
- **Hero Layout Güncellemesi**:
  - Sol: Büyük QR World animasyonu (60% width)
  - Sağ: Copywriting + CTA (40% width)
  - "Bir QR kod, dünyayı yakalayın" headline

### 2. Yeni Bölümler Ekleme (Eksikleri Düzeltme)
- **Testimonials Section**: Müşteri yorumları + avatarlar
- **Pricing Section**: 3-tier (Ücretsiz / PRO / Enterprise)
- **Live Demo Section**: Gerçek profil örnekleri
- **Logo Grid**: Partner/müşteri logoları

### 3. Emoji → Flaticon Icon Dönüşümü
- Tüm emojiler kaldırılacak (🛒, 📅, 🎁, 📊, 📝, 🖼️, ✨, 📞, 💬, 📍, ⏰, 🌐, ★, ✓)
- Lucide React + Flaticon SVG iconlar kullanılacak

### 4. Güçlü Yönleri Koruma
- Mocha/Cream (#F5F0E8) tema renkleri
- Framer Motion animasyonları
- Responsive tasarım
- Mevcut section'lar (Stats, Product, Solutions, Modules, FAQ, CTA, Footer)

### 5. Dosya Yapısı
- `src/components/landing/QRWorldAnimation.tsx` (yeni)
- `src/components/landing/TestimonialsSection.tsx` (yeni)
- `src/components/landing/PricingSection.tsx` (yeni)
- `src/components/landing/LiveDemoSection.tsx` (yeni)
- `src/components/landing/LandingPage.tsx` (güncelle)

### 6. Teknik Detaylar
- Canvas render optimizasyonu (requestAnimationFrame)
- Mobilde animasyon düşürme
- IntersectionObserver lazy loading
- Tailwind + TypeScript