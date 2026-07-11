import http from "node:http";

const port = Number.parseInt(process.env.TASK5_FIXTURE_PORT || "4176", 10);
const task7ResponseDelayMs = Number.parseInt(process.env.TASK7_RESPONSE_DELAY_MS || "0", 10);
const task8BrowserFixtures = process.env.TASK8_BROWSER_FIXTURES === "1";
const requestCounts = new Map();
let task8Scenario = "default";
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

const task7Products = Array.from({ length: 200 }, (_, index) => {
  const itemNumber = index + 1;
  const [red, green, blue] = task7ProductColor(itemNumber);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" data-product="${itemNumber}" width="112" height="104"><rect width="112" height="104" fill="rgb(${red},${green},${blue})"/></svg>`;
  return {
    categoryId: index < 100 ? "popular" : "second",
    description: `Task 7 deterministic product ${itemNumber}`,
    id: `task7-product-${itemNumber}`,
    image: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    imageUrl: null,
    inStock: true,
    name: `Task 7 Ürünü ${itemNumber}`,
    price: 100 + index,
    sortOrder: index
  };
});

const task7EcommerceProducts = Array.from({ length: 12 }, (_, index) => ({
  businessId: "88888888-8888-4888-8888-888888888888",
  categoryId: index < 6 ? "home" : "office",
  categoryName: index < 6 ? "Home" : "Office",
  description: `Distinct ecommerce fixture product ${index + 1}`,
  id: `task7-ecommerce-product-${index + 1}`,
  images: [],
  isActive: true,
  name: `Ecommerce Product ${index + 1}`,
  price: 40 + index,
  sortOrder: index,
  status: "active",
  stock: 20,
  trackStock: true
}));

const task7EcommerceSettings = {
  checkoutSettings: { allowNotes: true, requireAddress: true, requireEmail: false, requirePhone: true },
  currency: "TRY",
  freeShippingThreshold: 500,
  id: "88888888-8888-4888-8888-888888888888",
  minOrderAmount: 0,
  paymentMethods: { card: false, cash: true, online: false, transfer: false },
  shippingOptions: [{ estimatedDays: "2 days", id: "standard", isActive: true, name: "Standard", price: 49.9 }],
  storeDescription: "Task 7 checkout fixture",
  storeName: "Task 7 Ecommerce",
  taxRate: 0
};

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

const task8CategoryCycle = [
  { category: "cafe", categoryLabel: "Kafe" },
  { category: "health", categoryLabel: "Klinik" },
  { category: "design", categoryLabel: "Tasarım" }
];
const task8Businesses = task7Businesses.map((business, index) => ({
  ...business,
  ...task8CategoryCycle[index % task8CategoryCycle.length]
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
  primaryModuleId: "fastfood",
  cartEnabled: true,
  showHours: false,
  social: {},
  workingHours: null
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
  response.setHeader("Cache-Control", "no-store");

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
  if (url.pathname === "/_task8/scenario" && request.method === "POST") {
    const scenario = url.searchParams.get("name");
    if (!task8BrowserFixtures || !["default", "sparse"].includes(scenario)) {
      response.writeHead(400).end();
      return;
    }
    task8Scenario = scenario;
    response.writeHead(204).end();
    return;
  }

  if (request.method === "GET" && url.pathname.startsWith("/api/")) recordRequest(url);
  if (task7ResponseDelayMs > 0 && ["/api/kesfet", "/api/kesfet/categories", "/api/cities"].includes(url.pathname)) {
    await new Promise((resolve) => setTimeout(resolve, task7ResponseDelayMs));
  }
  if (task7ResponseDelayMs > 0 && (
    url.pathname === "/api/public/profile/task7-business"
    || url.pathname.startsWith("/api/public/profile/task7-profile-")
  )) {
    await new Promise((resolve) => setTimeout(resolve, Math.max(5_000, task7ResponseDelayMs)));
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
    body = task8BrowserFixtures && task8Scenario === "sparse"
      ? { ...task7Guide, places: [] }
      : task7Guide;
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
    const fixtureBusinesses = task8BrowserFixtures
      ? task8Scenario === "sparse" ? [] : task8Businesses
      : task7Businesses;
    body = {
      businesses: fixtureBusinesses,
      hasMore: false,
      limit: Number(url.searchParams.get("limit") || 16),
      page: Number(url.searchParams.get("page") || 1),
      success: true,
      total: fixtureBusinesses.length
    };
  } else if (url.pathname === "/api/kesfet/appointments/options") {
    body = {
      success: true,
      nativeEnabled: true,
      vertical: "clinic",
      services: Array.from({ length: 6 }, (_, index) => ({
        currency: "TRY", description: null, durationMinutes: 30 + index * 5,
        id: `appointment-service-${index + 1}`, name: `Randevu Hizmeti ${index + 1}`, price: 300 + index * 50
      })),
      staff: Array.from({ length: 4 }, (_, index) => ({ id: `appointment-staff-${index + 1}`, name: `Uzman ${index + 1}`, title: "Uzman" })),
      slots: Array.from({ length: 12 }, (_, index) => ({
        date: "2026-07-20", serviceId: "appointment-service-1",
        staffId: "appointment-staff-1", time: `${String(9 + Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`
      })),
      settings: { requireEmail: false, requirePhone: true, slotMinutes: 30, workingHours: {} }
    };
  } else if (url.pathname === "/api/kesfet/reservations/options") {
    body = url.searchParams.get("businessSlug") === "task9-reservation" ? {
      success: true,
      nativeEnabled: true,
      vertical: "hotel",
      business: { id: "task9-hotel", name: "Task 9 Otel", slug: "task9-reservation" },
      resources: Array.from({ length: 6 }, (_, index) => ({
        capacity: 2 + index, description: `Oda ${index + 1}`, id: `task9-room-${index + 1}`,
        imageUrl: null, name: `Oda Tipi ${index + 1}`, timeSlots: [], unitPrice: 1200 + index * 250
      })),
      timeSlots: []
    } : { success: true, nativeEnabled: false, vertical: null, business: null, resources: [], timeSlots: [] };
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
  } else if (url.pathname === "/api/public/products") {
    body = {
      categories: [
        { id: "home", name: "Home", sortOrder: 0 },
        { id: "office", name: "Office", sortOrder: 1 }
      ],
      products: task7EcommerceProducts,
      success: true
    };
  } else if (url.pathname === "/api/public/ecommerce-settings") {
    body = { settings: task7EcommerceSettings, success: true };
  } else if (url.pathname === "/api/public/checkout" && request.method === "POST") {
    body = { orderId: "task7-ecommerce-order", orderNumber: "T7-E-001", success: true, total: 131.9 };
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
  const isGeometryProfile = /^task7-profile-(360|390|430)$/.test(slug);
  const knownSlugs = new Set([
    "task5-fixture",
    "task5-loading",
    "task5-error",
    "task5-empty",
    "task5-cart-disabled",
    "task5-restaurant",
    "task7-200",
    "task7-business",
    "task7-ecommerce",
    "task9-appointment",
    "task9-reservation",
    "task9-catalog"
  ]);
  if (!knownSlugs.has(slug) && !isGeometryProfile) return null;

  const isRestaurant = slug === "task5-restaurant";
  const isEcommerce = slug === "task7-ecommerce";
  const isAppointment = slug === "task9-appointment";
  const isReservation = slug === "task9-reservation";
  const isCatalog = slug === "task9-catalog";
  return {
    ...baseProfile,
    hasRestaurantModule: isRestaurant,
    primaryModuleId: isAppointment ? "clinic" : isReservation ? "hotel" : isCatalog ? "petshop" : isEcommerce ? "ecommerce" : isRestaurant ? "restaurant" : "fastfood",
    industry: isAppointment ? "clinic" : isReservation ? "hotel" : isCatalog ? "petshop" : isEcommerce ? "ecommerce" : isRestaurant ? "restaurant" : "fastfood",
    industryLabel: isAppointment ? "Klinik" : isReservation ? "Otel" : isCatalog ? "Petshop" : isEcommerce ? "Ecommerce" : isRestaurant ? "Restoran" : "Fast Food",
    modules: [isAppointment ? "clinic" : isReservation ? "hotel" : isCatalog ? "petshop" : isEcommerce ? "ecommerce" : isRestaurant ? "restaurant" : "fastfood"],
    id: isEcommerce ? task7EcommerceSettings.id : slug.startsWith("task7-") ? "77777777-7777-4777-8777-777777777777" : baseProfile.id,
    name: isEcommerce ? "Task 7 Ecommerce" : slug === "task7-business" ? "Task 7 Test İşletmesi" : slug === "task7-200" ? "Task 7 200 Ürün" : baseProfile.name,
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

function task7ProductColor(itemNumber) {
  return [
    32 + (itemNumber * 37) % 192,
    32 + (itemNumber * 67) % 192,
    32 + (itemNumber * 97) % 192
  ];
}
