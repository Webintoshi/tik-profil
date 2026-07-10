import http from "node:http";
import { buildAllowedUpstreamHeaders, isAllowedProxyPath } from "./proxy-headers.mjs";

const port = Number(process.env.TIKPROFIL_LOCAL_PROXY_PORT || 8787);
const upstream = process.env.TIKPROFIL_UPSTREAM_URL || "https://tikprofil.com";
function writeCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function writeJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(payload));
}

async function readRequestBody(request) {
  return new Promise((resolve) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

function getPublicProfileSlug(pathname) {
  const prefix = "/api/public/profile/";
  if (!pathname.startsWith(prefix)) {
    return null;
  }

  const slug = pathname.slice(prefix.length).split("/")[0];
  return slug ? decodeURIComponent(slug) : null;
}

function parseJsonString(value) {
  if (!value || value === "$undefined") {
    return undefined;
  }

  try {
    return JSON.parse(`"${value}"`);
  } catch {
    return value;
  }
}

function readSerializedString(segment, field) {
  const match = new RegExp(`"${field}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`).exec(segment);
  return parseJsonString(match?.[1]);
}

function readSerializedBoolean(segment, field, fallback = false) {
  const match = new RegExp(`"${field}"\\s*:\\s*(true|false)`).exec(segment);
  return match ? match[1] === "true" : fallback;
}

function readSerializedStringArray(segment, field) {
  const match = new RegExp(`"${field}"\\s*:\\s*(\\[[^\\]]*\\])`).exec(segment);
  if (!match) {
    return [];
  }

  try {
    const parsed = JSON.parse(match[1].replace(/"\$undefined"/g, "null"));
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function extractProfileFromPublicPage(html, slug) {
  const normalized = html
    .replace(/\\"/g, "\"")
    .replace(/\\u0026/g, "&");
  const markerIndex = normalized.indexOf("\"business\":{");

  if (markerIndex === -1) {
    return null;
  }

  const segment = normalized.slice(markerIndex, markerIndex + 30000);
  const socialStart = segment.indexOf("\"social\":{");
  const socialSegment = socialStart === -1 ? "" : segment.slice(socialStart, socialStart + 3000);
  const id = readSerializedString(segment, "id") || slug;
  const name = readSerializedString(segment, "name");

  if (!name) {
    return null;
  }

  const industry = readSerializedString(segment, "industry") || "default";
  const modules = readSerializedStringArray(segment, "modules");

  return {
    id,
    slug: readSerializedString(segment, "slug") || slug,
    name,
    logo: readSerializedString(segment, "logo") || null,
    cover: readSerializedString(segment, "cover") || null,
    industry,
    industryLabel: readSerializedString(segment, "industryLabel") || "Isletme",
    isVerified: readSerializedBoolean(segment, "isVerified", true),
    phone: readSerializedString(segment, "phone") || null,
    whatsapp: readSerializedString(segment, "whatsapp") || null,
    about: readSerializedString(segment, "about") || null,
    address: readSerializedString(segment, "address") || null,
    mapsUrl: readSerializedString(segment, "mapsUrl") || null,
    showHours: readSerializedBoolean(segment, "showHours", false),
    workingHours: [],
    modules,
    hasRestaurantModule: readSerializedBoolean(segment, "hasRestaurantModule", modules.includes("restaurant")),
    cartEnabled: readSerializedBoolean(segment, "cartEnabled", true),
    social: {
      website: readSerializedString(socialSegment, "website") || null,
      instagram: readSerializedString(socialSegment, "instagram") || null,
      youtube: readSerializedString(socialSegment, "youtube") || null,
      google: readSerializedString(socialSegment, "google") || null,
      facebook: readSerializedString(socialSegment, "facebook") || null,
      twitter: readSerializedString(socialSegment, "twitter") || null,
      tiktok: readSerializedString(socialSegment, "tiktok") || null,
      linkedin: readSerializedString(socialSegment, "linkedin") || null,
    },
  };
}

async function fetchPublicPageProfile(slug) {
  const pageUrl = new URL(`/${encodeURIComponent(slug)}`, upstream);
  const pageResponse = await fetch(pageUrl, { headers: { Accept: "text/html" } });

  if (!pageResponse.ok) {
    return null;
  }

  return extractProfileFromPublicPage(await pageResponse.text(), slug);
}

function isFoodBusiness(business) {
  const category = `${business.category || ""} ${business.categoryLabel || ""}`.toLowerCase();
  return ["food", "yemek", "fast", "burger", "restoran", "restaurant", "cafe", "kafe"].some((token) =>
    category.includes(token)
  );
}

async function fetchKesfetFallbackProfile(slug) {
  const kesfetUrl = new URL("/api/kesfet", upstream);
  kesfetUrl.searchParams.set("limit", "200");

  const kesfetResponse = await fetch(kesfetUrl);
  if (!kesfetResponse.ok) {
    return null;
  }

  const payload = await kesfetResponse.json();
  const business = Array.isArray(payload.businesses)
    ? payload.businesses.find((item) => item.slug === slug)
    : null;

  if (!business) {
    return null;
  }

  const foodBusiness = isFoodBusiness(business);

  return {
    id: business.id || slug,
    slug: business.slug || slug,
    name: business.name || "Isletme",
    logo: business.logoUrl || null,
    cover: business.coverImage || business.logoUrl || null,
    industry: business.category || (foodBusiness ? "fastfood" : "default"),
    industryLabel: business.categoryLabel || business.category || "Isletme",
    isVerified: true,
    phone: null,
    whatsapp: null,
    about: null,
    address: [business.district, business.city].filter(Boolean).join(", ") || null,
    mapsUrl: null,
    showHours: false,
    workingHours: [],
    modules: foodBusiness ? ["fastfood"] : [],
    hasRestaurantModule: foodBusiness,
    cartEnabled: foodBusiness,
    social: {},
  };
}

async function handlePublicProfile(requestUrl, response) {
  const slug = getPublicProfileSlug(requestUrl.pathname);

  if (!slug) {
    writeJson(response, 400, { success: false, profile: null, redirectTarget: null });
    return;
  }

  const upstreamApiUrl = new URL(`${requestUrl.pathname}${requestUrl.search}`, upstream);
  const upstreamApiResponse = await fetch(upstreamApiUrl);

  if (upstreamApiResponse.ok) {
    response.writeHead(upstreamApiResponse.status, {
      "Content-Type": upstreamApiResponse.headers.get("content-type") || "application/json"
    });
    response.end(Buffer.from(await upstreamApiResponse.arrayBuffer()));
    return;
  }

  const profile = await fetchPublicPageProfile(slug) || await fetchKesfetFallbackProfile(slug);

  if (!profile) {
    writeJson(response, 404, { success: false, profile: null, redirectTarget: null });
    return;
  }

  writeJson(response, 200, { success: true, profile, redirectTarget: null });
}

const server = http.createServer(async (request, response) => {
  writeCorsHeaders(response);

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  const requestUrl = new URL(request.url || "/", `http://localhost:${port}`);
  const isAllowed = isAllowedProxyPath(requestUrl.pathname);

  if (!isAllowed) {
    writeJson(response, 404, { success: false, error: "Not found" });
    return;
  }

  try {
    if (request.method === "GET" && requestUrl.pathname.startsWith("/api/public/profile/")) {
      await handlePublicProfile(requestUrl, response);
      return;
    }

    const upstreamUrl = new URL(`${requestUrl.pathname}${requestUrl.search}`, upstream);
    const upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers: buildAllowedUpstreamHeaders(requestUrl.pathname, request.headers),
      body: request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await readRequestBody(request)
    });

    response.writeHead(upstreamResponse.status, {
      "Content-Type": upstreamResponse.headers.get("content-type") || "application/json"
    });
    response.end(Buffer.from(await upstreamResponse.arrayBuffer()));
  } catch (error) {
    writeJson(response, 502, {
      success: false,
      error: error instanceof Error ? error.message : "Proxy error"
    });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Tik Profil local admin API proxy listening on http://localhost:${port}`);
});
