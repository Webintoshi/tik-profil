export const allowedPrefixes = [
  "/api/cities",
  "/api/fastfood/public-menu",
  "/api/kesfet",
  "/api/mobile/account",
  "/api/qr-scan",
  "/api/public/checkout",
  "/api/public/ecommerce-settings",
  "/api/public/profile",
  "/api/public/products",
  "/api/restaurant/public-menu"
];

export function isAllowedProxyPath(pathname) {
  return allowedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function buildUpstreamHeaders(headers) {
  const upstreamHeaders = {
    "Content-Type": headers["content-type"] || "application/json"
  };
  if (typeof headers.authorization === "string" && headers.authorization) {
    upstreamHeaders.Authorization = headers.authorization;
  }
  return upstreamHeaders;
}

export function buildAllowedUpstreamHeaders(pathname, headers) {
  return isAllowedProxyPath(pathname) ? buildUpstreamHeaders(headers) : null;
}
