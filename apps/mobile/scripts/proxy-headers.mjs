export const allowedPrefixes = [
  "/api/cities",
  "/api/fastfood/orders",
  "/api/fastfood/public-menu",
  "/api/fastfood/validate-coupon",
  "/api/kesfet",
  "/api/mobile/account",
  "/api/qr-scan",
  "/api/public/checkout",
  "/api/public/ecommerce-settings",
  "/api/public/profile",
  "/api/public/products",
  "/api/restaurant/public-menu"
];

const authenticatedPaths = new Set([
  "/api/fastfood/orders",
  "/api/kesfet/user/profile",
  "/api/kesfet/user/favorites",
  "/api/kesfet/appointments",
  "/api/kesfet/inquiries",
  "/api/kesfet/orders",
  "/api/kesfet/reservations",
  "/api/mobile/account/avatar"
]);

const authenticatedPrefixes = [
  "/api/kesfet/appointments/",
  "/api/kesfet/inquiries/",
  "/api/kesfet/reservations/"
];

export function isAllowedProxyPath(pathname) {
  return allowedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function shouldForwardAuthorization(pathname) {
  return authenticatedPaths.has(pathname)
    || authenticatedPrefixes.some((prefix) => pathname.startsWith(prefix));
}

function buildUpstreamHeaders(pathname, headers) {
  const upstreamHeaders = {
    "Content-Type": headers["content-type"] || "application/json"
  };
  if (shouldForwardAuthorization(pathname) && typeof headers.authorization === "string" && headers.authorization) {
    upstreamHeaders.Authorization = headers.authorization;
  }
  return upstreamHeaders;
}

export function buildAllowedUpstreamHeaders(pathname, headers) {
  return isAllowedProxyPath(pathname) ? buildUpstreamHeaders(pathname, headers) : null;
}
