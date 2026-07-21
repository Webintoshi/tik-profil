# Akıllı Rota Keşfet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keşfet ve şehir rehberi ekranlarını admin tarafından yönetilen fotoğraflı, numaralı rota durakları ve işletme bağlantılarıyla çalışan Akıllı Rota deneyimine dönüştürmek.

**Architecture:** Blog yayınları geriye dönük Markdown desteğini korurken yapılandırılmış `sections` ve `routeStops` alanları kazanacak. Admin bu alanları ve R2 medyasını yönetecek; mobil API katmanı doğrulanmış veriyi sunum modeline çevirecek; Keşfet ve rehber ekranları bu modeli tema uyumlu bileşenlerle render edecek.

**Tech Stack:** Next.js 15 route handlers, Zod, documentStore, Cloudflare R2 direct upload, Expo Router 56, React Native 0.85, expo-image, react-native-svg, Node test runner, Playwright visual regression.

## Global Constraints

- Mobil pakete statik Ordu rehber içeriği eklenmeyecek.
- Kapak ve rota durak görselleri admin kayıtlarından ve R2 URL'lerinden gelecek.
- Amber yalnızca vurgu ve eylem rengidir; normal gövde metni olarak kullanılmayacak.
- Gündüz ve gece temaları aynı hiyerarşiyi koruyacak.
- Dokunma alanları en az 44x44 noktadır.
- Tam navigasyon motoru eklenmeyecek; koordinatlı duraklar cihazın harita uygulamasına aktarılacak.
- Eski Markdown yayınları çalışmaya devam edecek.

---

### Task 1: Rehber İçerik Sözleşmesi

**Files:**
- Create: `src/lib/blog-guide-contract.ts`
- Create: `src/lib/blog-guide-contract.test.ts`
- Modify: `src/lib/blog-posts.ts`
- Modify: `src/app/api/blog-posts/route.ts`
- Modify: `src/app/api/blog-posts/city-filter.test.ts`

**Interfaces:**
- Produces: `GuideSection`, `RouteStop`, `normalizeGuideSections(value)`, `normalizeRouteStops(value)`, `blogGuideFieldsSchema`.
- Consumes: Existing `BlogPost`, Zod API validation, `documentStore` CRUD.

- [ ] **Step 1: Write failing normalization tests**

```ts
test("normalizes ordered route stops and rejects unsafe coordinates", () => {
  assert.deepEqual(normalizeRouteStops([
    { id: "b", order: 2, name: "Yason Burnu", note: "Gün batımı", imageUrl: "https://cdn.test/yason.webp", latitude: 41.13, longitude: 37.68 },
    { id: "a", order: 1, name: "Boztepe", note: "Manzara", imageUrl: "https://cdn.test/boztepe.webp", latitude: 40.98, longitude: 37.88 }
  ]).map((stop) => stop.id), ["a", "b"]);
  assert.deepEqual(normalizeRouteStops([{ id: "x", order: 1, name: "X", note: "X", imageUrl: "https://cdn.test/x.webp", latitude: 190, longitude: 37 }]), []);
});
```

- [ ] **Step 2: Run the test and verify failure**

Run: `node --test src/lib/blog-guide-contract.test.ts`

Expected: FAIL because `blog-guide-contract.ts` does not exist.

- [ ] **Step 3: Implement focused types and normalizers**

```ts
export interface GuideSection {
  id: string;
  heading: string;
  body: string;
  imageUrl?: string;
}

export interface RouteStop {
  id: string;
  order: number;
  name: string;
  district?: string;
  note: string;
  imageUrl: string;
  durationMinutes?: number;
  latitude?: number;
  longitude?: number;
  businessSlug?: string;
}

export function normalizeRouteStops(value: unknown): RouteStop[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(parseRouteStop).sort((a, b) => a.order - b.order);
}
```

`parseRouteStop` boş ad/not/görseli, yinelenen/negatif sırayı, `latitude` için `[-90, 90]` ve `longitude` için `[-180, 180]` dışını reddedecek. `normalizeGuideSections` boş başlık/gövdeyi reddedecek ve güvenli HTTP(S) görsellerini koruyacak.

- [ ] **Step 4: Extend API schema and persistence**

`blogPostSchema` içine aşağıdaki alanları ekle ve POST/PUT/GET normalizasyonunda kaybetmeden taşı:

```ts
featured: z.boolean().default(false),
routeDurationMinutes: z.number().int().positive().max(1440).optional(),
sections: z.array(guideSectionSchema).default([]),
routeStops: z.array(routeStopSchema).default([])
```

- [ ] **Step 5: Run focused tests**

Run: `node --test src/lib/blog-guide-contract.test.ts src/app/api/blog-posts/city-filter.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/blog-guide-contract.ts src/lib/blog-guide-contract.test.ts src/lib/blog-posts.ts src/app/api/blog-posts/route.ts src/app/api/blog-posts/city-filter.test.ts
git commit -m "feat: add structured city guide contract"
```

### Task 2: Admin Rota Editörü ve R2 Medya

**Files:**
- Create: `src/components/dashboard/GuideRouteEditor.tsx`
- Create: `src/components/dashboard/guide-route-editor-state.ts`
- Create: `src/components/dashboard/guide-route-editor-state.test.ts`
- Modify: `src/app/dashboard/blog-content/page.tsx`
- Modify: `src/lib/uploadConfig.ts`

**Interfaces:**
- Consumes: `GuideSection`, `RouteStop`, `uploadImageWithFallback`.
- Produces: `GuideRouteEditor`, `reorderRouteStops(stops, from, to)`, admin payload containing `featured`, `routeDurationMinutes`, `sections`, `routeStops`.

- [ ] **Step 1: Write failing editor state tests**

```ts
test("reorders stops and rewrites one-based order values", () => {
  const result = reorderRouteStops([
    routeStop("a", 1), routeStop("b", 2), routeStop("c", 3)
  ], 2, 0);
  assert.deepEqual(result.map(({ id, order }) => ({ id, order })), [
    { id: "c", order: 1 }, { id: "a", order: 2 }, { id: "b", order: 3 }
  ]);
});
```

- [ ] **Step 2: Run the test and verify failure**

Run: `node --test src/components/dashboard/guide-route-editor-state.test.ts`

Expected: FAIL because the state helper does not exist.

- [ ] **Step 3: Implement state helpers and editor component**

`GuideRouteEditor` will expose controlled props:

```ts
interface GuideRouteEditorProps {
  routeDurationMinutes?: number;
  sections: GuideSection[];
  stops: RouteStop[];
  onDurationChange(value?: number): void;
  onSectionsChange(value: GuideSection[]): void;
  onStopsChange(value: RouteStop[]): void;
}
```

Each media picker will call:

```ts
const { url } = await uploadImageWithFallback({ file, moduleName: "covers" });
```

The editor will provide add/remove/reorder controls, image preview, duration, coordinates, district, note and `businessSlug` fields. Icon buttons use Lucide icons and accessible labels.

- [ ] **Step 4: Integrate the controlled editor into the blog form**

Extend `formData`, `handleEditPost`, `resetForm` and save payload. Replace the plain cover URL-only experience with file upload plus an advanced URL fallback.

- [ ] **Step 5: Add publish validation**

Before saving a published featured guide, enforce:

```ts
if (formData.published && formData.featured && (!formData.coverImage || formData.routeStops.some((stop) => !stop.imageUrl))) {
  showNotification("error", "Öne çıkan rehber için kapak ve tüm durak görselleri gereklidir");
  return;
}
```

- [ ] **Step 6: Run tests and typecheck**

Run: `node --test src/components/dashboard/guide-route-editor-state.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/dashboard/GuideRouteEditor.tsx src/components/dashboard/guide-route-editor-state.ts src/components/dashboard/guide-route-editor-state.test.ts src/app/dashboard/blog-content/page.tsx src/lib/uploadConfig.ts
git commit -m "feat: add admin smart route editor"
```

### Task 3: Mobil Rehber Veri Modeli

**Files:**
- Create: `apps/mobile/src/explore/smart-route.ts`
- Create: `apps/mobile/src/explore/smart-route.test.mts`
- Modify: `apps/mobile/src/api/kesfet.ts`
- Modify: `apps/mobile/src/api/kesfet.test.mts`
- Modify: `apps/mobile/src/explore/explore-presentation.ts`
- Modify: `apps/mobile/src/explore/explore-presentation.test.mts`

**Interfaces:**
- Consumes: API `CityArticle.sections`, `CityArticle.routeStops`, `featured`, `routeDurationMinutes`.
- Produces: `SmartRoute`, `toSmartRoute(article)`, `getFeaturedSmartRoute(articles)`, `getRouteMarkerPositions(stops)`.

- [ ] **Step 1: Write failing presentation tests**

```ts
test("selects the explicitly featured complete route", () => {
  const route = getFeaturedSmartRoute([
    article({ slug: "plain", featured: false, routeStops: [stop("a")] }),
    article({ slug: "featured", featured: true, coverImage: "https://cdn.test/cover.webp", routeStops: [stop("b")] })
  ]);
  assert.equal(route?.slug, "featured");
});

test("never promotes a route without cover or stop media", () => {
  assert.equal(getFeaturedSmartRoute([article({ featured: true, coverImage: "", routeStops: [stop("a")] })]), null);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test apps/mobile/src/explore/smart-route.test.mts`

Expected: FAIL because the smart route module does not exist.

- [ ] **Step 3: Extend runtime guards**

Update `CityArticle` and `isCityArticle` so optional structured fields are accepted only when every section/stop is valid. Remove mojibake repair from view components; normalize legacy data once in the API layer.

- [ ] **Step 4: Implement smart route selection and marker layout**

```ts
export function getFeaturedSmartRoute(articles: CityArticle[]): SmartRoute | null {
  const candidates = articles.map(toSmartRoute).filter((route): route is SmartRoute => Boolean(route));
  return candidates.find((route) => route.featured) ?? candidates[0] ?? null;
}
```

Coordinate-based marker positions are normalized inside 12%-88% bounds. Missing coordinates use deterministic positions indexed by route order.

- [ ] **Step 5: Run tests**

Run: `node --test apps/mobile/src/api/kesfet.test.mts apps/mobile/src/explore/smart-route.test.mts apps/mobile/src/explore/explore-presentation.test.mts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/explore/smart-route.ts apps/mobile/src/explore/smart-route.test.mts apps/mobile/src/api/kesfet.ts apps/mobile/src/api/kesfet.test.mts apps/mobile/src/explore/explore-presentation.ts apps/mobile/src/explore/explore-presentation.test.mts
git commit -m "feat: normalize mobile smart routes"
```

### Task 4: Akıllı Rota Keşfet Yüzeyi

**Files:**
- Create: `apps/mobile/src/components/explore/RouteMapPreview.tsx`
- Create: `apps/mobile/src/components/explore/FeaturedRouteCard.tsx`
- Create: `apps/mobile/src/components/explore/RouteGuideRail.tsx`
- Modify: `apps/mobile/app/(tabs)/explore.tsx`
- Modify: `apps/mobile/src/accessibility/task8-screen-contract.test.mts`
- Modify: `apps/mobile/scripts/task8-browser-regression.mjs`

**Interfaces:**
- Consumes: `SmartRoute`, `getRouteMarkerPositions`, theme tokens and `AnimatedPressable`.
- Produces: `RouteMapPreview`, `FeaturedRouteCard`, `RouteGuideRail`.

- [ ] **Step 1: Add failing screen contract assertions**

Assert that Explore owns `explore-featured-route`, numbered marker labels and image-backed article cards, and no longer renders the old `GuideCard` icon matrix.

- [ ] **Step 2: Run the contract test and verify failure**

Run: `node --test apps/mobile/src/accessibility/task8-screen-contract.test.mts`

Expected: FAIL because the smart route components are absent.

- [ ] **Step 3: Implement route preview**

Use `react-native-svg` for the lightweight route surface:

```tsx
<Svg height="100%" width="100%" accessibilityElementsHidden>
  <Path d={routePath} fill="none" stroke={colors.routeLine} strokeWidth={3} />
</Svg>
```

Render numbered markers as React Native views above the SVG so labels remain accessible and themeable.

- [ ] **Step 4: Recompose Explore**

Order becomes:

```ts
["identity", "featured-route", "route-guides", "linked-businesses"]
```

Remove the old text-only article rail and colored `GuideCard` strip. Keep pull-to-refresh, cached API behavior, bottom navigation spacing and existing business favorite behavior.

- [ ] **Step 5: Verify light/dark and responsive geometry**

Run: `npm --prefix apps/mobile run typecheck && npm --prefix apps/mobile run test:browser:task8:update && npm --prefix apps/mobile run test:browser:task8`

Expected: Typecheck PASS and 33 deterministic browser cases PASS twice.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/components/explore apps/mobile/app/'(tabs)'/explore.tsx apps/mobile/src/accessibility/task8-screen-contract.test.mts apps/mobile/scripts/task8-browser-regression.mjs artifacts/task-8/baselines
git commit -m "feat: redesign explore around smart routes"
```

### Task 5: Görsel Rehber Detayı ve Harita Eylemleri

**Files:**
- Create: `apps/mobile/src/components/explore/RouteTimeline.tsx`
- Create: `apps/mobile/src/explore/route-actions.ts`
- Create: `apps/mobile/src/explore/route-actions.test.mts`
- Modify: `apps/mobile/app/guide/[slug].tsx`
- Modify: `apps/mobile/src/accessibility/task8-screen-contract.test.mts`
- Modify: `apps/mobile/scripts/task8-browser-regression.mjs`

**Interfaces:**
- Consumes: `CityArticle.sections`, `CityArticle.routeStops`, Expo `Linking`, Expo Router.
- Produces: `buildDirectionsUrl(stop, platform)`, `RouteTimeline` and structured article renderer.

- [ ] **Step 1: Write failing route action tests**

```ts
test("builds platform-safe directions URLs", () => {
  assert.equal(buildDirectionsUrl({ latitude: 40.986, longitude: 37.879, name: "Boztepe" }, "android"), "geo:40.986,37.879?q=40.986%2C37.879%28Boztepe%29");
  assert.equal(buildDirectionsUrl({ latitude: 40.986, longitude: 37.879, name: "Boztepe" }, "web"), "https://www.google.com/maps/search/?api=1&query=40.986%2C37.879");
});
```

- [ ] **Step 2: Run and verify failure**

Run: `node --test apps/mobile/src/explore/route-actions.test.mts`

Expected: FAIL because `route-actions.ts` does not exist.

- [ ] **Step 3: Implement safe directions and profile actions**

Only emit a directions URL for finite in-range coordinates. Use `Linking.canOpenURL` before `Linking.openURL`; report a compact inline error if the device rejects the URL. Route `businessSlug` through `/business/[slug]` inside Expo Router.

- [ ] **Step 4: Rebuild guide detail**

Render, in order: image hero with small back button, metadata and summary, route statistics, `RouteMapPreview`, `RouteTimeline`, structured editorial sections, related profile actions. Render legacy Markdown only when `sections` is empty.

- [ ] **Step 5: Add visual and accessibility regression cases**

Add `light-guide-detail` and `dark-guide-detail` screenshots plus large-font assertions for wrapping headings and 44-point action targets.

- [ ] **Step 6: Run full mobile verification**

Run:

```bash
npm --prefix apps/mobile run test:unit
node apps/mobile/scripts/mobile-smoke-test.mjs
npm --prefix apps/mobile run typecheck
npm --prefix apps/mobile run export:web
npm --prefix apps/mobile run test:browser:task8
```

Expected: all commands PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/components/explore/RouteTimeline.tsx apps/mobile/src/explore/route-actions.ts apps/mobile/src/explore/route-actions.test.mts apps/mobile/app/guide/'[slug].tsx' apps/mobile/src/accessibility/task8-screen-contract.test.mts apps/mobile/scripts/task8-browser-regression.mjs artifacts/task-8/baselines
git commit -m "feat: add visual smart route guide detail"
```

### Task 6: Ordu İçerik Geçişi ve Uçtan Uca Doğrulama

**Files:**
- Modify through admin API: `blog_posts/ordu-tescilli-lezzetler-rehberi`
- Modify through admin API: `blog_posts/ordu-gezilecek-yerler-rota-rehberi`
- Create generated media under R2 `blog/ordu/*`
- Modify: `docs/logto-operations.md` only if deployment procedure changes

**Interfaces:**
- Consumes: Admin blog API contract and R2 uploader from Tasks 1-2.
- Produces: Two fully populated dynamic Ordu guides with cover, sections and route stops.

- [ ] **Step 1: Generate Ordu-specific media**

Create distinct 16:10 photographic assets for the two covers and each unique stop. No text, logos, watermarks or generic foreign-city imagery. Place approved files in R2 through the authenticated upload path.

- [ ] **Step 2: Update both admin records**

Set `featured: true` only on the primary Ordu route. Populate `routeDurationMinutes`, structured `sections`, ordered `routeStops`, coordinates and known `businessSlug` values. Do not add the content to mobile source files.

- [ ] **Step 3: Verify public API persistence**

Run:

```bash
curl -fsS "https://tikprofil.com/api/blog-posts?city=Ordu"
curl -fsS "https://tikprofil.com/api/blog-posts?slug=ordu-gezilecek-yerler-rota-rehberi"
```

Expected: Both posts expose non-empty `coverImage`, `sections`, `routeStops`; exactly one is featured.

- [ ] **Step 4: Verify local mobile UI**

Open `http://localhost:8082/explore` and both guide routes. Verify photos load, route markers do not overlap, back navigation works, linked profiles remain in-app and no mojibake appears.

- [ ] **Step 5: Run repository verification**

Run:

```bash
git diff --check
npm run typecheck
npm run build
npm --prefix apps/mobile run test
```

Expected: all commands PASS.

- [ ] **Step 6: Commit any final test-only adjustments**

```bash
git add <only files changed by final verification>
git commit -m "test: verify smart route discovery flow"
```
