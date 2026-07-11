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
  price: index === 0 ? 987654.32 : 100 + index,
  sortOrder: index
}));

const profile = {
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

const menu = {
  businessId: profile.id,
  businessName: profile.name,
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
    freeDeliveryAbove: 1000,
    minOrderAmount: 0,
    onlinePayment: false,
    pickupEnabled: true
  }
};

const server = http.createServer((request, response) => {
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Origin", "*");

  if (request.method === "OPTIONS") {
    response.writeHead(204).end();
    return;
  }

  const url = new URL(request.url || "/", `http://127.0.0.1:${port}`);
  let body;

  if (url.pathname === "/api/public/profile/task5-fixture") {
    body = { profile, redirectTarget: null, success: true };
  } else if (url.pathname === "/api/fastfood/public-menu") {
    body = url.searchParams.get("businessSlug") === profile.slug
      ? { data: menu, success: true }
      : { error: "Fixture not found", success: false };
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
