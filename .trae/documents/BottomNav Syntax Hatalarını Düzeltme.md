# BottomNav.tsx Syntax Hatalarını Düzeltme

## Tespit Edilen Hatalar

1. **Line 23**: `if` koşulunda `===` eksik
   - Hatalı: `if (href === "/kesfet") {`
   - Doğru: `if (href === "/kesfet") {`

2. **Lines 97-98**: Fazladan kapanış etiketleri
   - Line 97-98'de gereksiz `/>` ve `)}` var
   - Bunlar kaldırılacak

## Düzeltilecek Kod

```tsx
// Line 23 düzeltmesi
if (href === "/kesfet") {  // Eksik === eklenecek

// Lines 88-98 arası düzeltme - fazladan kapanış etiketlerini kaldır
{active && (
    <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className={`absolute -bottom-1 left-1/2 -translate-x-1/2
                        w-1 h-1 rounded-full
                        ${isDark ? "bg-emerald-400" : "bg-emerald-500"}`}
    />
)}  // Fazladan /> ve )} kaldırılacak
```

## Beklenen Sonuç
- BottomNav component'i düzgün derlenecek
- /kesfet sayfası açılacak
- Framer Motion animasyonları çalışacak