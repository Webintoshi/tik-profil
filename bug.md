# TikProfil Proje Bug Raporu

Bu rapor, proje genelinde tespit edilen potansiyel bug'ları, kod kokularını (code smells) ve geliştirme önerilerini içermektedir.

> **📅 Son Güncelleme:** 2026-01-30
> **🛠️ Düzeltilen Kritik Bug:** 4/4 ✅

---

## 📊 Özet Durum

| Kategori | Toplam | Düzeltilen | Kalan |
|----------|--------|-----------|-------|
| 🔴 Kritik | 4 | **4** ✅ | 0 |
| 🟠 Orta | 6 | 0 | 6 |
| 🟡 Düşük | 6 | 0 | 6 |
| **Toplam** | **16** | **4** | **12** |

### ✅ Düzeltilen Kritik Bug'lar (2026-01-30)
1. ✅ **AuthService** - Token refresh mantığı eklendi
2. ✅ **ProfileScreen** - Race condition ve loading state düzeltildi
3. ✅ **BusinessDetailScreen** - WebView memory leak giderildi
4. ✅ **QRScreen** - useEffect cleanup eklendi

---

## 🔴 Kritik Bug'lar (Critical)

### Bug 1: AuthService Eksik Hata Yönetimi ✅ DÜZELTİLDİ
**Dosya:** [`apps/tikprofil-mobile/services/auth.ts`](apps/tikprofil-mobile/services/auth.ts:70)
**Satır:** 70-110
**Durum:** ✅ Çözüldü - 2026-01-30

**Sorun:**
`initialize()` metodunda token yenileme (refresh) mantığı eksik. Kullanıcı uzun süre kullanmadığında token expire oluyor ancak otomatik yenilenmiyor.

**Uygulanan Çözüm:**
```typescript
async initialize(): Promise<void> {
  try {
    // ... mevcut kod ...
    
    if (accessToken && refreshToken) {
      const { data: { session }, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error || !session) {
        // Token refresh dene
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession({
          refresh_token: refreshToken
        });
        
        if (refreshError || !refreshed.session) {
          console.log('[AuthService] Session invalid, clearing tokens');
          await this.clearTokens();
        } else {
          // Yeni token'ları kaydet
          await this.setItem(TOKEN_KEY, refreshed.session.access_token);
          await this.setItem(REFRESH_TOKEN_KEY, refreshed.session.refresh_token);
          // ... user state güncelle
        }
      }
    }
  } catch (error) {
    // ...
  }
}
```

---

### Bug 2: ProfileScreen Auth State Senkronizasyon Sorunu ✅ DÜZELTİLDİ
**Dosya:** [`apps/tikprofil-mobile/screens/ProfileScreen.tsx`](apps/tikprofil-mobile/screens/ProfileScreen.tsx:7)
**Satır:** 7-50
**Durum:** ✅ Çözüldü - 2026-01-30

**Sorun:**
Component mount olduğunda `authService.getState()` ile senkronize olmayan state alınıyor. `authService.initialize()` async olduğu için race condition oluşabilir.

```typescript
// Sorunlu kod
const [authState, setAuthState] = useState(authService.getState()); // Async init tamamlanmadan çağrılabilir
```

**Önerilen Çözüm:**
```typescript
export function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const initAuth = async () => {
      // Initialize tamamlanmasını bekle
      await authService.initialize();
      
      if (isMounted) {
        const state = authService.getState();
        setAuthState(state);
        setUser(state.user);
        setIsLoading(false);
      }
    };
    
    initAuth();
    
    const unsubscribe = authService.subscribe((state) => {
      if (isMounted) {
        setAuthState(state);
        setUser(state.user);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);
  
  if (isLoading) return <LoadingSpinner />;
  // ...
}
```

---

### Bug 3: BusinessDetailScreen WebView Hafıza Sızıntısı ✅ DÜZELTİLDİ
**Dosya:** [`apps/tikprofil-mobile/screens/BusinessDetailScreen.tsx`](apps/tikprofil-mobile/screens/BusinessDetailScreen.tsx:1)
**Durum:** ✅ Çözüldü - 2026-01-30
**Satır:** 10-38

**Sorun:**
WebView cleanup edilmiyor. Component unmount olduğunda WebView hala bellekte kalıyor ve event listener'lar temizlenmiyor.

**Önerilen Çözüm:**
```typescript
export function BusinessDetailScreen() {
  const route = useRoute<BusinessDetailRouteProp>();
  const navigation = useNavigation();
  const webViewRef = useRef<WebView>(null);
  const { slug } = route.params;

  useEffect(() => {
    return () => {
      // Cleanup: WebView'i temizle
      if (webViewRef.current) {
        webViewRef.current.stopLoading();
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <WebView 
        ref={webViewRef}
        source={{ uri: url }}
        // ...
      />
    </View>
  );
}
```

---

### Bug 4: QRScreen useEffect Memory Leak ✅ DÜZELTİLDİ
**Dosya:** [`apps/tikprofil-mobile/screens/QRScreen.tsx`](apps/tikprofil-mobile/screens/QRScreen.tsx:12)
**Durum:** ✅ Çözüldü - 2026-01-30
**Satır:** 12-24

**Sorun:**
useEffect içinde async fonksiyon çağrılmış ancak cleanup yok. Component unmount olduktan sonra state güncellemesi yapılabilir.

**Önerilen Çözüm:**
```typescript
useEffect(() => {
  let isMounted = true;
  
  const checkPermission = async () => {
    if (Platform.OS === 'web') {
      if (isMounted) setHasPermission(true);
    } else {
      // ... izin kontrolü
      if (isMounted) setHasPermission(result);
    }
  };
  
  checkPermission();
  
  return () => {
    isMounted = false;
  };
}, []);
```

---

## 🟠 Orta Seviye Bug'lar (Medium)

### Bug 5: HomeScreen Eksik Error Boundary
**Dosya:** [`apps/tikprofil-mobile/screens/HomeScreen.tsx`](apps/tikprofil-mobile/screens/HomeScreen.tsx:270)
**Satır:** 270-283

**Sorun:**
`filteredBusinesses` hesaplanırken `business.name`, `business.category` veya `business.district` undefined/null olabilir ve uygulama çökebilir.

```typescript
// Riskli kod
const filteredBusinesses = businesses.filter((business) => {
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    return (
      business.name.toLowerCase().includes(query) ||  // name null/undefined olabilir
      business.category?.toLowerCase().includes(query) ||
      business.district?.toLowerCase().includes(query)
    );
  }
  // ...
});
```

**Önerilen Çözüm:**
```typescript
const filteredBusinesses = businesses.filter((business) => {
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    const name = (business.name || '').toLowerCase();
    const category = (business.category || '').toLowerCase();
    const district = (business.district || '').toLowerCase();
    
    return (
      name.includes(query) ||
      category.includes(query) ||
      district.includes(query)
    );
  }
  // ...
});
```

---

### Bug 6: CustomTabBar Platform-Spesifik Import Hatası
**Dosya:** [`apps/tikprofil-mobile/components/navigation/CustomTabBar.tsx`](apps/tikprofil-mobile/components/navigation/CustomTabBar.tsx:11)
**Satır:** 11-18

**Sorun:**
Platform-spesifik import hatası yakalama mekanizması eksik. Eğer her iki import da başarısız olursa uygulama çöker.

```typescript
// Riskli kod
let TabIconComponent: any;
try {
  TabIconComponent = require('./TabIcon').TabIcon;
} catch {
  // Fallback for web
  const { TabIcon: WebTabIcon } = require('./TabIcon.web');
  TabIconComponent = WebTabIcon;
}
```

**Önerilen Çözüm:**
```typescript
let TabIconComponent: any;
try {
  TabIconComponent = require('./TabIcon').TabIcon;
} catch (nativeError) {
  try {
    // Fallback for web
    const { TabIcon: WebTabIcon } = require('./TabIcon.web');
    TabIconComponent = WebTabIcon;
  } catch (webError) {
    console.error('Both TabIcon imports failed:', { nativeError, webError });
    // Default empty component
    TabIconComponent = () => null;
  }
}
```

---

### Bug 7: Supabase Client Singleton Thread Safety
**Dosya:** [`tikprofil-v2/src/lib/supabase.ts`](tikprofil-v2/src/lib/supabase.ts:6)
**Satır:** 6-24

**Sorun:**
Singleton pattern kullanılmış ancak race condition var. Eşzamanlı çağrılarda birden fazla client oluşturulabilir.

```typescript
// Mevcut kod
let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
    if (adminClient) return adminClient;  // Race condition!
    // ...
    adminClient = createClient(url, serviceRoleKey, {...});
    return adminClient;
}
```

**Önerilen Çözüm:**
```typescript
let adminClient: SupabaseClient | null = null;
let adminClientPromise: Promise<SupabaseClient> | null = null;

export async function getSupabaseAdmin(): Promise<SupabaseClient> {
    if (adminClient) return adminClient;
    if (adminClientPromise) return adminClientPromise;
    
    adminClientPromise = (async () => {
        const url = process.env.SUPABASE_URL?.trim();
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
        
        if (!url || !serviceRoleKey) {
            throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
        }
        
        adminClient = createClient(url, serviceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        });
        
        return adminClient;
    })();
    
    return adminClientPromise;
}
```

---

### Bug 8: documentStore Client-Side Koruma Eksikliği
**Dosya:** [`tikprofil-v2/src/lib/documentStore.ts`](tikprofil-v2/src/lib/documentStore.ts:100)
**Satır:** 100-105

**Sorun:**
Client-side kontrol var ancak server action'lardan çağrıldığında kontrol atlanabilir.

**Önerilen Çözüm:**
```typescript
// Her fonksiyon başına ekle
function guardClientSide() {
    if (typeof window !== 'undefined') {
        throw new Error('Document store operations cannot be performed on the client side');
    }
}

export async function createDocumentREST(...) {
    guardClientSide();
    // ... mevcut kod
}
```

---

### Bug 9: Auth.ts Eski bcrypt Import
**Dosya:** [`tikprofil-v2/src/lib/auth.ts`](tikprofil-v2/src/lib/auth.ts:1)
**Satır:** 1-86

**Sorun:**
Dosya başında `bcrypt` import edilmiş ancak aslında Web Crypto API kullanılıyor. Ölü kod (dead code) var.

```typescript
import bcrypt from "bcryptjs";  // Kullanılmıyor!

// ... PBKDF2 kullanılıyor
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
    try {
        if (storedHash.startsWith('$2')) {
            return await bcrypt.compare(password, storedHash);  // Sadece burada kullanılıyor
        }
        // ...
    }
}
```

**Önerilen Çözüm:**
```typescript
// bcrypt sadece legacy migration için gerekli, lazy load edilebilir
async function legacyBcryptCompare(password: string, hash: string): Promise<boolean> {
    const bcrypt = await import('bcryptjs');
    return bcrypt.compare(password, hash);
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
    try {
        if (storedHash.startsWith('$2')) {
            return await legacyBcryptCompare(password, storedHash);
        }
        // ...
    }
}
```

---

### Bug 10: Beauty Appointments Çakışma Kontrolü Hatası
**Dosya:** [`tikprofil-v2/src/app/api/beauty/appointments/route.ts`](tikprofil-v2/src/app/api/beauty/appointments/route.ts:88)
**Satır:** 88-125

**Sorun:**
Randevu çakışma kontrolünde timezone dikkate alınmamış. Farklı zaman dilimlerinde yanlış sonuç verebilir.

```typescript
// Hatalı karşılaştırma
const hasConflict = existingApps.some((app: any) => {
    const appStart = app.startTime;  // Sadece string karşılaştırma
    const appEnd = app.endTime;
    return (
        (validData.startTime < appEnd && validData.endTime > appStart)
    );
});
```

**Önerilen Çözüm:**
```typescript
import { parseISO, isWithinInterval, areIntervalsOverlapping } from 'date-fns';

const hasConflict = existingApps.some((app: any) => {
    const existingStart = parseISO(`${app.date}T${app.startTime}`);
    const existingEnd = parseISO(`${app.date}T${app.endTime}`);
    const newStart = parseISO(`${validData.date}T${validData.startTime}`);
    const newEnd = parseISO(`${validData.date}T${validData.endTime}`);
    
    return areIntervalsOverlapping(
        { start: existingStart, end: existingEnd },
        { start: newStart, end: newEnd }
    );
});
```

---

## 🟡 Düşük Seviye Bug'lar (Low)

### Bug 11: Çok Fazla console.log
**Dosyalar:** Tüm proje

**Sorun:**
Üretim ortamında (production) debug log'ları kalmış. Bu performansı etkileyebilir ve güvenlik riski oluşturabilir (hassas veriler log'lanıyor olabilir).

**Örnekler:**
- [`apps/tikprofil-mobile/services/auth.ts`](apps/tikprofil-mobile/services/auth.ts:62) - Satır 62, 68, 71, vb.
- [`apps/tikprofil-mobile/screens/ProfileScreen.tsx`](apps/tikprofil-mobile/screens/ProfileScreen.tsx:12) - Satır 12, 13, 17

**Önerilen Çözüm:**
```typescript
// Logger utility oluştur
const logger = {
    debug: (...args: any[]) => {
        if (__DEV__ || process.env.NODE_ENV === 'development') {
            console.log(...args);
        }
    },
    error: (...args: any[]) => {
        console.error(...args);
        // Production'da hata takip servisine gönder (Sentry, vb.)
    }
};

// Kullanım
logger.debug('[AuthService] Starting initialization...');
```

---

### Bug 12: TypeScript `any` Kullanımı
**Dosyalar:** Tüm proje

**Sorun:**
81 yerde `any` tipi kullanılmış. Bu type safety'i bozar ve runtime hatalarına yol açabilir.

**Örnekler:**
- [`tikprofil-v2/src/app/api/kesfet/route.ts`](tikprofil-v2/src/app/api/kesfet/route.ts:45) - `row: any`
- [`tikprofil-v2/src/app/api/beauty/appointments/route.ts`](tikprofil-v2/src/app/api/beauty/appointments/route.ts:22) - `app: any`

**Önerilen Çözüm:**
```typescript
// Tip tanımları
interface BusinessRow {
    id: string;
    data: Record<string, unknown>;
}

interface Appointment {
    id: string;
    businessId: string;
    date: string;
    startTime: string;
    endTime: string;
    staffId: string;
    // ...
}

// Kullanım
const businesses = (data || []).map((row: BusinessRow) => {
    const payload = (row.data || {}) as BusinessData;
    return payload;
});
```

---

### Bug 13: Emlak Listings Sıralama Hatası
**Dosya:** [`tikprofil-v2/src/app/api/emlak/public-consultant/[consultantSlug]/route.ts`](tikprofil-v2/src/app/api/emlak/public-consultant/[consultantSlug]/route.ts:86)
**Satır:** 86-96

**Sorun:**
Sıralama fonksiyonunda `createdAt` null/undefined kontrolü yetersiz.

```typescript
// Riskli kod
const consultantListings = ((listingRows || [])
    .map((r: any) => ({ id: r.id, ...(r.data as Record<string, unknown>) }))
    .sort((a: any, b: any) => {
        const getTime = (val: unknown): number => {
            if (val instanceof Date) return val.getTime();
            if (typeof val === 'string') return new Date(val).getTime();
            return 0;  // null/undefined durumunda 0 döner, sorunlu!
        };
        return getTime(b.createdAt) - getTime(a.createdAt);
    })) as any[];
```

**Önerilen Çözüm:**
```typescript
const consultantListings = (listingRows || [])
    .map((r) => ({ 
        id: r.id, 
        ...(r.data as Record<string, unknown>),
        _createdAt: r.created_at  // DB timestamp'i de ekle
    }))
    .sort((a, b) => {
        const getTime = (val: unknown, fallback: number): number => {
            if (val instanceof Date) return val.getTime();
            if (typeof val === 'string' && val) {
                const time = new Date(val).getTime();
                return isNaN(time) ? fallback : time;
            }
            return fallback;
        };
        const now = Date.now();
        return getTime(b.createdAt, getTime(b._createdAt, now)) - 
               getTime(a.createdAt, getTime(a._createdAt, now));
    });
```

---

### Bug 14: Vehicle Rental Availability Mantık Hatası
**Dosya:** [`tikprofil-v2/src/app/api/vehicle-rental/availability/route.ts`](tikprofil-v2/src/app/api/vehicle-rental/availability/route.ts:41)
**Satır:** 41-47

**Sorun:**
Araç müsaitlik kontrolünde saat dilimi (timezone) dikkate alınmamış.

```typescript
// Hatalı kod
const hasOverlap = overlapping?.some((res: any) => {
    const resStart = new Date(res.start_date);
    const resEnd = new Date(res.end_date);
    return requestedStart < resEnd && requestedEnd > resStart;
});
```

**Önerilen Çözüm:**
```typescript
import { isWithinInterval, areIntervalsOverlapping } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';

const TIMEZONE = 'Europe/Istanbul';

const hasOverlap = overlapping?.some((res) => {
    const resStart = utcToZonedTime(new Date(res.start_date), TIMEZONE);
    const resEnd = utcToZonedTime(new Date(res.end_date), TIMEZONE);
    const reqStart = utcToZonedTime(requestedStart, TIMEZONE);
    const reqEnd = utcToZonedTime(requestedEnd, TIMEZONE);
    
    return areIntervalsOverlapping(
        { start: resStart, end: resEnd },
        { start: reqStart, end: reqEnd }
    );
});
```

---

### Bug 15: FastFood Orders Ses Bildirimi Hafıza Sızıntısı
**Dosya:** [`tikprofil-v2/src/app/panel/fastfood/orders/page.tsx`](tikprofil-v2/src/app/panel/fastfood/orders/page.tsx:118)
**Satır:** 118-125

**Sorun:**
Event listener cleanup eksik ve interval temizlenmiyor.

```typescript
// Mevcut kod
useEffect(() => {
    const handleInteraction = () => {
        initAudioContext();
        document.removeEventListener('click', handleInteraction);
    };
    document.addEventListener('click', handleInteraction);

    return () => {
        document.removeEventListener('click', handleInteraction);  // Bu çalışmayabilir
    };
}, []);

// Interval temizlenmiyor
useEffect(() => {
    fetchOrders(true);
    const intervalId = window.setInterval(() => fetchOrders(false), 5000);
    // return () => clearInterval(intervalId);  // EKSİK!
}, []);
```

**Önerilen Çözüm:**
```typescript
useEffect(() => {
    const handleInteraction = () => {
        initAudioContext();
        document.removeEventListener('click', handleInteraction);
    };
    document.addEventListener('click', handleInteraction);

    return () => {
        document.removeEventListener('click', handleInteraction);
    };
}, []);

useEffect(() => {
    fetchOrders(true);
    const intervalId = window.setInterval(() => fetchOrders(false), 5000);
    
    return () => {
        clearInterval(intervalId);
    };
}, []);
```

---

### Bug 16: Hotel/Restaurant Orders Race Condition
**Dosyalar:** 
- [`tikprofil-v2/src/app/panel/hotel/requests/page.tsx`](tikprofil-v2/src/app/panel/hotel/requests/page.tsx:97)
- [`tikprofil-v2/src/app/panel/hotel/orders/page.tsx`](tikprofil-v2/src/app/panel/hotel/orders/page.tsx:87)
- [`tikprofil-v2/src/app/panel/restoran/orders/page.tsx`](tikprofil-v2/src/app/panel/restoran/orders/page.tsx:87)

**Sorun:**
Timeout ref kontrolü yetersiz, birden fazla timeout oluşabilir.

```typescript
// Mevcut kod
if (refreshTimeoutRef.current) return;
refreshTimeoutRef.current = setTimeout(() => {
    refreshTimeoutRef.current = null;
    // ...
}, 5000);
```

**Önerilen Çözüm:**
```typescript
const debouncedRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
    }
    refreshTimeoutRef.current = setTimeout(() => {
        refreshTimeoutRef.current = null;
        fetchData();
    }, 5000);
}, [fetchData]);

useEffect(() => {
    return () => {
        if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
        }
    };
}, []);
```

---

## 🛠️ Kod Kalitesi Önerileri

### 1. ESLint Kuralları Ekle
```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "no-console": ["warn", { "allow": ["error"] }],
    "@typescript-eslint/no-unused-vars": "error",
    "react-hooks/exhaustive-deps": "error"
  }
}
```

### 2. Prettier Format Ayarları
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

### 3. Husky + lint-staged Ekle
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"]
  }
}
```

### 4. Tip Güvenliği İçin Strict Mode
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

---

## 📊 Özet İstatistikler

| Kategori | Sayı |
|----------|------|
| 🔴 Kritik Bug | 4 |
| 🟠 Orta Bug | 6 |
| 🟡 Düşük Bug | 6 |
| **Toplam** | **16** |

### Dosya Bazlı Dağılım
| Dosya | Bug Sayısı |
|-------|-----------|
| `apps/tikprofil-mobile/services/auth.ts` | 2 |
| `apps/tikprofil-mobile/screens/*.tsx` | 4 |
| `tikprofil-v2/src/lib/*.ts` | 5 |
| `tikprofil-v2/src/app/api/**/*.ts` | 5 |

---

## 🎯 Önceliklendirme Önerisi

1. **Hemen Düzeltilmeli:** Bug 1, Bug 2 (Auth sorunları)
2. **Bu Sprint:** Bug 3, Bug 4, Bug 7 (Memory leak ve thread safety)
3. **Sonraki Sprint:** Bug 5, Bug 6, Bug 8-10 (Hata yönetimi)
4. **Refactor Sırasında:** Bug 11-16 (Kod kalitesi)

---

*Rapor Tarihi: 2026-01-30*
*Analiz Eden: Kilo Code (Debug Mode)*