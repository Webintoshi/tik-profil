# Tik Profil performance stack

## Redis

Reuse the existing `tik-profil-redis` resource through its private Coolify URL.
The application treats Redis as an optional cache: a short timeout and circuit
breaker keep discovery and profile requests available when Redis is unhealthy.

## imgproxy

Create a Docker Compose service from `imgproxy.compose.yml` and configure:

- `IMGPROXY_KEY`: 64 random bytes encoded as hex.
- `IMGPROXY_SALT`: 64 random bytes encoded as hex.
- `IMGPROXY_ALLOWED_SOURCES`: the exact public R2 prefix, including trailing `/`.

Set the application runtime variables `IMAGE_PROXY_URL`, `IMAGE_PROXY_KEY`,
`IMAGE_PROXY_SALT`, and `CLOUDFLARE_R2_PUBLIC_URL` to the matching values.
Only owned R2 media is routed through imgproxy; Google Place Photos stay on the
live Google endpoint and keep their required no-store behavior.

## Verification

1. `GET /api/health/ready` reports PostgreSQL and Redis as `ok`.
2. Discovery responses contain `CDN-Cache-Control` and signed WebP URLs for
   owned media.
3. `GET <IMAGE_PROXY_URL>/health` returns HTTP 200.
