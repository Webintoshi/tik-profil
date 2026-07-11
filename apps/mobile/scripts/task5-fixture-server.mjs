import http from "node:http";

const port = Number.parseInt(process.env.TASK5_FIXTURE_PORT || "4176", 10);
const task7ResponseDelayMs = Number.parseInt(process.env.TASK7_RESPONSE_DELAY_MS || "0", 10);
const requestCounts = new Map();
const products = Array.from({ length: 14 }, (_, index) => ({
  categoryId: index < 7 ? "popular" : "meals",
  description: `Deterministic fixture product ${index + 1}`,
  id: `product-${index + 1}`,
  image: null,
  imageUrl: null,
  inStock: true,
  name: index === 0 ? "Büyük Karışık Menü" : `Test Ürünü ${index + 1}`,
  price: index === 0 ? 101 : index === 13 ? 987654.32 : 100 + index,
  sortOrder: index,
  ...(index === 1 ? { extraGroupIds: ["fixture-sauce"] } : {})
}));

const task7Products = Array.from({ length: 200 }, (_, index) => ({
  categoryId: index < 100 ? "popular" : "second",
  description: `Task 7 deterministic product ${index + 1}`,
  id: `task7-product-${index + 1}`,
  image: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" id="task7-image-${index + 1}" width="112" height="104"><rect width="112" height="104" fill="teal"/></svg>`,
  imageUrl: null,
  inStock: true,
  name: `Task 7 Ürünü ${index + 1}`,
  price: 100 + index,
  sortOrder: index
}));

const task7Businesses = Array.from({ length: 13 }, (_, index) => ({
  category: "fast_food",
  categoryLabel: "Fast Food",
  city: "Ordu",
  coverImage: null,
  createdAt: "2026-07-11T00:00:00.000Z",
  distance: null,
  district: "Altınordu",
  id: index === 0 ? "77777777-7777-4777-8777-777777777777" : `task7-business-${index}`,
  industryId: null,
  lat: null,
  lng: null,
  logoUrl: null,
  name: index === 0 ? "Task 7 Test İşletmesi" : `Task 7 İşletmesi ${index + 1}`,
  rating: null,
  reviewCount: null,
  slug: index === 0 ? "task7-business" : `task7-list-${index}`
}));

const task7Guide = {
  id: "ordu",
  name: "Ordu",
  plate: 52,
  tagline: "Mavinin ve yeşilin buluştuğu oksijen diyarı.",
  description: "Karadeniz'in incisi Ordu; sahil rotası, Boztepe manzarası, kahve durakları ve yerel lezzetleriyle keşif akışını besler.",
  coverImage: "https://images.unsplash.com/photo-1625903995874-9f20c4228964?q=80&w=2000&auto=format&fit=crop",
  places: [
    { id: "ordu-food-guide", name: "Ordu'da ne yenir?", image: "https://example.com/food.jpg", category: "Yeme içme" },
    { id: "ordu-coffee-guide", name: "Boztepe'de kahve molası", image: "https://example.com/coffee.jpg", category: "Kafe rotası" },
    { id: "ordu-coast-guide", name: "Sahil boyunca balık ve yürüyüş", image: "https://example.com/coast.jpg", category: "Sahil" },
    { id: "ordu-yason-guide", name: "Yason Burnu gezi rotası", image: "https://example.com/yason.jpg", category: "Gezi" }
  ]
};

const baseProfile = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "task5-fixture",
  name: "Task 5 Test Mutfağı",
  logo: null,
  cover: null,
  industry: "fastfood",
  industryLabel: "Fast Food",
  isVerified: true,
  phone: "+905551112233",
  whatsapp: "+905551112233",
  about: "Kalıcı sepet ve kompakt menü yerleşim testi",
  address: "Ordu",
  mapsUrl: null,
  modules: ["fastfood"],
  hasRestaurantModule: false,
  cartEnabled: true,
  social: {}
};

const baseMenu = {
  businessId: baseProfile.id,
  businessName: baseProfile.name,
  categories: [
    { id: "popular", name: "Popüler", icon: "*", sortOrder: 0 },
    { id: "meals", name: "Menüler", icon: "+", sortOrder: 1 }
  ],
  products,
  extras: [
    { groupId: "fixture-sauce", id: "fixture-ketchup", isDefault: false, name: "Ketçap", priceModifier: 0 }
  ],
  extraGroups: [
    {
      extras: [{ groupId: "fixture-sauce", id: "fixture-ketchup", isDefault: false, name: "Ketçap", priceModifier: 0 }],
      id: "fixture-sauce",
      isRequired: false,
      maxSelections: 1,
      name: "Sos",
      selectionType: "single"
    }
  ],
  settings: {
    cartEnabled: true,
    cashPayment: true,
    cardOnDelivery: true,
    deliveryEnabled: true,
    deliveryFee: 25,
    freeDeliveryAbove: 200,
    minOrderAmount: 0,
    onlinePayment: false,
    pickupEnabled: true
  }
};

const server = http.createServer(async (request, response) => {
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Origin", "*");

  if (request.method === "OPTIONS") {
    response.writeHead(204).end();
    return;
  }

  const url = new URL(request.url || "/", `http://127.0.0.1:${port}`);
  let body;

  if (url.pathname === "/_task7/counts") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify([...requestCounts.values()]));
    return;
  }
  if (url.pathname === "/_task7/reset" && request.method === "POST") {
    requestCounts.clear();
    response.writeHead(204).end();
    return;
  }

  if (request.method === "GET" && url.pathname.startsWith("/api/")) recordRequest(url);
  if (task7ResponseDelayMs > 0 && ["/api/kesfet", "/api/kesfet/categories", "/api/cities"].includes(url.pathname)) {
    await new Promise((resolve) => setTimeout(resolve, task7ResponseDelayMs));
  }

  if (url.pathname.startsWith("/api/public/profile/")) {
    const slug = decodeURIComponent(url.pathname.slice("/api/public/profile/".length));
    const profile = buildProfile(slug);
    body = profile
      ? { profile, redirectTarget: null, success: true }
      : { profile: null, redirectTarget: null, success: false };
  } else if (url.pathname === "/api/qr-scan" && request.method === "POST") {
    body = { success: true };
  } else if (url.pathname === "/api/cities") {
    body = task7Guide;
  } else if (url.pathname === "/api/kesfet/categories") {
    body = {
      categories: [
        { count: 7, emoji: "food", id: "fast_food", label: "Fast Food" },
        { count: 6, emoji: "store", id: "other", label: "Diğer" }
      ],
      success: true,
      total: task7Businesses.length
    };
  } else if (url.pathname === "/api/kesfet") {
    body = {
      businesses: task7Businesses,
      hasMore: false,
      limit: Number(url.searchParams.get("limit") || 16),
      page: Number(url.searchParams.get("page") || 1),
      success: true,
      total: task7Businesses.length
    };
  } else if (url.pathname === "/api/fastfood/public-menu" || url.pathname === "/api/restaurant/public-menu") {
    const slug = url.searchParams.get("businessSlug") || "";
    body = await buildMenuResponse(slug, url.pathname.includes("restaurant"));
  } else if (url.pathname === "/api/fastfood/validate-coupon" && request.method === "POST") {
    body = {
      coupon: { code: "TASK5", discountType: "fixed", id: "task5-coupon" },
      discount: 10,
      message: "10 TL indirim",
      valid: true
    };
  } else if (url.pathname === "/api/fastfood/orders" && request.method === "POST") {
    body = { orderId: "fixture-order", orderNumber: "T5-001", status: "pending", success: true };
  } else {
    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`Task 5 fixture API listening on http://127.0.0.1:${port}\n`);
});

function close() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", close);
process.on("SIGTERM", close);

function buildProfile(slug) {
  const knownSlugs = new Set([
    "task5-fixture",
    "task5-loading",
    "task5-error",
    "task5-empty",
    "task5-cart-disabled",
    "task5-restaurant",
    "task7-200",
    "task7-business"
  ]);
  if (!knownSlugs.has(slug)) return null;

  const isRestaurant = slug === "task5-restaurant";
  return {
    ...baseProfile,
    hasRestaurantModule: isRestaurant,
    industry: isRestaurant ? "restaurant" : "fastfood",
    industryLabel: isRestaurant ? "Restoran" : "Fast Food",
    modules: [isRestaurant ? "restaurant" : "fastfood"],
    id: slug.startsWith("task7-") ? "77777777-7777-4777-8777-777777777777" : baseProfile.id,
    name: slug === "task7-business" ? "Task 7 Test İşletmesi" : slug === "task7-200" ? "Task 7 200 Ürün" : baseProfile.name,
    slug
  };
}

async function buildMenuResponse(slug, restaurantRequest) {
  const profile = buildProfile(slug);
  if (!profile || restaurantRequest !== (slug === "task5-restaurant")) {
    return { error: "Fixture not found", success: false };
  }
  if (slug === "task5-loading") {
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  if (slug === "task5-error") {
    return { error: "Deterministic menu error", success: false };
  }

  return {
    data: {
      ...baseMenu,
      businessName: profile.name,
      categories: slug === "task7-200"
        ? [
            { id: "popular", name: "İlk kategori", icon: "1", sortOrder: 0 },
            { id: "second", name: "İkinci kategori", icon: "2", sortOrder: 1 }
          ]
        : baseMenu.categories,
      products: slug === "task5-empty" ? [] : slug === "task7-200" ? task7Products : products,
      settings: {
        ...baseMenu.settings,
        cartEnabled: slug !== "task5-cart-disabled" && slug !== "task5-restaurant"
      }
    },
    success: true
  };
}

function recordRequest(url) {
  const entries = [...url.searchParams.entries()].sort(([aKey, aValue], [bKey, bValue]) => {
    return aKey.localeCompare(bKey) || aValue.localeCompare(bValue);
  });
  const search = new URLSearchParams(entries).toString();
  const key = `${url.pathname}?${search}`;
  const current = requestCounts.get(key);
  requestCounts.set(key, {
    count: (current?.count || 0) + 1,
    pathname: url.pathname,
    search
  });
}
