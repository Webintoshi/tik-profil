import http from "node:http";

const port = Number.parseInt(process.env.TASK5_FIXTURE_PORT || "4176", 10);
const products = Array.from({ length: 14 }, (_, index) => ({
  categoryId: index < 7 ? "popular" : "meals",
  description: `Deterministic fixture product ${index + 1}`,
  id: `product-${index + 1}`,
  image: null,
  imageUrl: null,
  inStock: true,
  name: index === 0 ? "Büyük Karışık Menü" : `Test Ürünü ${index + 1}`,
  price: index === 0 ? 101 : index === 13 ? 987654.32 : 100 + index,
  sortOrder: index
}));

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
  extras: [],
  extraGroups: [],
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

  if (url.pathname.startsWith("/api/public/profile/")) {
    const slug = decodeURIComponent(url.pathname.slice("/api/public/profile/".length));
    const profile = buildProfile(slug);
    body = profile
      ? { profile, redirectTarget: null, success: true }
      : { profile: null, redirectTarget: null, success: false };
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
    "task5-restaurant"
  ]);
  if (!knownSlugs.has(slug)) return null;

  const isRestaurant = slug === "task5-restaurant";
  return {
    ...baseProfile,
    hasRestaurantModule: isRestaurant,
    industry: isRestaurant ? "restaurant" : "fastfood",
    industryLabel: isRestaurant ? "Restoran" : "Fast Food",
    modules: [isRestaurant ? "restaurant" : "fastfood"],
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
      products: slug === "task5-empty" ? [] : products,
      settings: {
        ...baseMenu.settings,
        cartEnabled: slug !== "task5-cart-disabled" && slug !== "task5-restaurant"
      }
    },
    success: true
  };
}
