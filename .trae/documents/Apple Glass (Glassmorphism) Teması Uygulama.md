## Apple Glass (Glassmorphism) Teması Uygulama Planı

### Temel Glassmorphism Özellikleri
- **Şeffaf Arka Planlar**: `bg-white/10`, `bg-white/20` gibi opacity'li arka planlar
- **Yüksek Blur**: `backdrop-blur-xl`, `backdrop-blur-2xl` ile bulanıklaştırma
- **İnce Border'lar**: `border-white/20` ile subtle çerçeveler
- **Soft Shadow'lar**: `shadow-xl`, `shadow-2xl` ile yumuşak gölgeler
- **Derinlik Katmanları**: İçerik arası layering
- **Apple Renk Paleti**: Mavi, gri, beyaz tonları

### Değiştirilecek Bölümler

#### 1. **Hero Section**
- Ana konteyner için `backdrop-blur-2xl` ve `bg-white/15`
- Floating orb'leri daha subtle ve Apple-style renklerle güncelleme
- CTA butonlarını glassmorphism ile yeniden tasarlama
- Gradient overlay'ler ile derinlik katmanları

#### 2. **Stats Section**
- Her stat kart için glassmorphism container
- İnce border'lar ve soft shadow'lar
- Transparent arka planlarla derinlik hissi

#### 3. **Product/Features Section**
- Feature kartları için glassmorphism design
- Hover'da enhanced blur ve shadow efektleri
- Icon container'lar için glassmorphism

#### 4. **Navigation**
- Fixed header için `backdrop-blur-xl` ve `bg-white/10`
- İnce border ve subtle shadow
- Mobile menu için glassmorphism overlay

#### 5. **Footer**
- Glassmorphism container'lar
- Social link'ler için glassmorphism butonlar

### Teknik Yaklaşım
- Tailwind CSS `backdrop-blur` utility'leri
- `bg-opacity-*` class'ları ile şeffaflık
- `border-white/*` ile subtle border'lar
- Framer Motion ile smooth animasyonlar (sürükle, fade, scale)

### Beklenen Sonuç
Apple UI ile uyumlu, modern, şeffaf ve derinlik hissi veren bir ana sayfa tasarımı.