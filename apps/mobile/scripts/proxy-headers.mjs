export function buildUpstreamHeaders(headers) {
  const upstreamHeaders = {
    "Content-Type": headers["content-type"] || "application/json"
  };
  if (typeof headers.authorization === "string" && headers.authorization) {
    upstreamHeaders.Authorization = headers.authorization;
  }
  return upstreamHeaders;
}
