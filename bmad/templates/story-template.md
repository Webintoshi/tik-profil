# STORY-[XXX]: [Başlık]

## 📋 Bilgiler

| Alan | Değer |
|------|-------|
| **ID** | STORY-XXX |
| **Feature** | [Feature Adı] |
| **PRD** | [Link] |
| **Priority** | P0/P1/P2 |
| **Points** | 1/2/3/5/8/13 |
| **Platform** | Web/Mobile/Both |
| **Assignee** | Full-Stack Dev |
| **Durum** | Backlog/In Progress/Done |

## 📝 Açıklama

[Story'nin amacı ve kapsamı. Ne yapılacak?]

### Kullanıcı Hikayesi
Bir **[kullanıcı tipi]** olarak **[amaç]** istiyorum çünkü **[neden]**

## 🔧 Teknik Detaylar

### Web (Next.js)
| Dosya | Açıklama |
|-------|----------|
| `tikprofil-v2/src/app/[route]/page.tsx` | Ana sayfa |
| `tikprofil-v2/src/app/[route]/layout.tsx` | Layout |
| `tikprofil-v2/src/app/[route]/loading.tsx` | Loading state |
| `tikprofil-v2/src/components/features/[Feature]/` | Feature components |
| `tikprofil-v2/src/lib/actions/[action].ts` | Server Actions |

### Mobile (Expo)
| Dosya | Açıklama |
|-------|----------|
| `apps/tikprofil-mobile/screens/[Screen].tsx` | Screen component |
| `apps/tikprofil-mobile/hooks/use[Hook].ts` | Custom hook |
| `apps/tikprofil-mobile/components/features/[Feature]/` | Feature components |

### Shared Packages
| Dosya | Açıklama |
|-------|----------|
| `packages/shared-api/src/[module].ts` | API fonksiyonları |
| `packages/shared-types/src/[type].ts` | TypeScript tipleri |
| `packages/shared-utils/src/[util].ts` | Utility fonksiyonlar |

### Database (gerekirse)
| Dosya | Açıklama |
|-------|----------|
| `tikprofil-v2/supabase/migrations/[timestamp]_[name].sql` | Migration |
| RLS Policy | [Policy açıklaması] |

## ✅ Acceptance Criteria

- [ ] **AC1:** [Kriter]
- [ ] **AC2:** [Kriter]
- [ ] **AC3:** [Kriter]
- [ ] **AC4:** [Kriter]

## 🧪 Test Senaryoları

### Unit Tests
- [ ] [Test senaryosu 1]
- [ ] [Test senaryosu 2]

### Integration Tests
- [ ] [Test senaryosu 1]
- [ ] [Test senaryosu 2]

### E2E Tests (gerekirse)
- [ ] [Test senaryosu 1]

## 🎨 UI/UX Notları

### Tasarım
- [ ] [Tasarım notu 1]
- [ ] [Tasarım notu 2]

### Etkileşimler
- [ ] Loading state
- [ ] Error state
- [ ] Empty state
- [ ] Success feedback

## 🔗 Bağımlılıklar

### Story Bağımlılıkları
- [ ] **Önce tamamlanmalı:** [STORY-XXX]
- [ ] **Sonra başlayabilir:** [STORY-XXX]

### API Bağımlılıkları
- [ ] [Endpoint/Fonksiyon]

## 📝 Implementation Notları

### Kod Parçacıkları

#### Web
```typescript
// [Açıklama]
[Code snippet]
```

#### Mobile
```typescript
// [Açıklama]
[Code snippet]
```

#### Shared API
```typescript
// [Açıklama]
[Code snippet]
```

### Önemli Noktalar
- [ ] [Not 1]
- [ ] [Not 2]

## ✅ Code Review Checklist

- [ ] Tüm AC'ler karşılandı
- [ ] TypeScript strict mode hatası yok
- [ ] ESLint hatası yok
- [ ] Test coverage %80+
- [ ] Shared API güncellendi (gerekirse)
- [ ] DB migration yazıldı (gerekirse)
- [ ] RLS policy eklendi (gerekirse)
- [ ] Auth check eklendi (private data için)
- [ ] Error handling var
- [ ] Loading state var

## 📝 Günlük (Daily Log)

| Tarih | Yapılan İş | Süre | Notlar |
|-------|------------|------|--------|
| YYYY-MM-DD | [İş] | [X saat] | [Not] |
