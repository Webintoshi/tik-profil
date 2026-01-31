## 🎯 Modern Bottom Navigation Bar Redesign Planı

### 📂 Dosya Yapısı

```
apps/tikprofil-mobile/
├── components/
│   └── navigation/
│       ├── CustomTabBar.tsx          (Yeni - Ana Tab Bar)
│       ├── TabIcon.tsx               (Yeni - Animasyonlu İkon)
│       ├── QRActionButton.tsx        (Yeni - Merkez QR Butonu)
│       └── TabBarBackground.tsx      (Yeni - Glass Morphism)
├── hooks/
│   └── useTabAnimations.ts           (Yeni - Animasyon Hooks)
├── constants/
│   └── theme.ts                      (Yeni - Color/Sizing Constants)
└── navigation/
    └── AppNavigator.tsx              (Güncelle - Yeni komponenti kullan)
```

### ✨ Implementasyon Adımları

#### 1. **Theme Constants** (`constants/theme.ts`)

* Light/Dark mode renk paleti (HSL format)

* WCAG AAA compliant kontrast değerleri

* Animation timing constants

* Spacing/sizing tokens

#### 2. **Tab Bar Background** (`TabBarBackground.tsx`)

* Frosted glass effect (blur + opacity)

* Subtle gradient overlay

* Top border with gradient fade

* Safe area padding for iOS

#### 3. **Animated Tab Icon** (`TabIcon.tsx`)

* Scale animation (1.0 → 1.15)

* Spring physics (damping: 12, stiffness: 180)

* Smooth color interpolation

* Icon morphing (outline ↔ filled)

* Ripple effect on press

#### 4. **QR Action Button** (`QRActionButton.tsx`)

* Elevated floating design

* Animated glow shadow (pulse 1500ms)

* Haptic feedback on press

* Spring bounce animation

* Gradient background

#### 5. **Custom Tab Bar** (`CustomTabBar.tsx`)

* Animated bar visibility (auto-hide on scroll)

* Dark mode auto-detection

* Haptic feedback integration

* Accessibility labels + hints

* Optimize for 200% zoom

#### 6. **Animation Hooks** (`hooks/useTabAnimations.ts`)

* Shared animated values

* Spring animation configs

* Color interpolation helpers

* Haptic feedback triggers

#### 7. **Update AppNavigator** (Mevcut dosya)

* Custom tab bar entegrasyonu

* Screen options güncelleme

* Safe area provider wrapper

### 🎨 Tasarım Özellikleri

**Light Mode:**

* Active: Blue gradient (#3B82F6 → #2563EB)

* Inactive: Gray (#9CA3AF) → Darker on hover (#4B5563)

* Bar: rgba(255,255,255,0.85) + blur(20px)

**Dark Mode:**

* Active: Blue gradient (#60A5FA → #3B82F6)

* Inactive: Gray (#6B7280) → Lighter on hover (#D1D5DB)

* Bar: rgba(17,24,39,0.85) + blur(20px)

**Animations:**

* Tab press: Spring scale + color fade (320ms)

* Center button: Pulse glow + bounce (400ms)

* Page transition: Slide + fade (250ms)

**Accessibility:**

* 44x44px min touch target

* 7:1 contrast ratio (WCAG AAA)

* Semantic labels + hints

* Screen reader announcements

**Performance:**

* Native driver for animations

* Memoized icon components

* Optimized re-renders

### 📦 Yeni Dependencies (Gerekirse)

```json
{
  "react-native-haptics": "~1.x",  // Haptic feedback
  "@react-native-community/blur": "~4.x"  // Blur effect (native)
}
```

### ✅ Test Checklist

* [ ] Light mode render

* [ ] Dark mode render

* [ ] Tab change animations

* [ ] Center button press + haptic

* [ ] Safe area (iOS + notched devices)

* [ ] 200% zoom clarity

* [ ] Accessibility contrast

* [ ] Screen reader navigation

* [ ] Performance (60 FPS)

* [ ] Web platform compatibility

