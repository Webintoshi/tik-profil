# Tenant Auth Guards

## Shared guards

- `src/server/auth/guards.ts` centralizes the current legacy auth checks.
- `requirePlatformAdmin()` accepts only the admin session cookie.
- `requireBusinessMember()` derives `businessId` from the owner/staff session.
- `requireBusinessOwner()` narrows `requireBusinessMember()` to owners.
- `requireStaffPermission()` reuses the current permission model for staff checks.
- `requireConsultant()` validates the consultant session cookie.
- `requireCustomer()` intentionally returns `501 CUSTOMER_AUTH_NOT_READY`.
- `publicReadOnly()` and `resolvePublicBusinessContext()` document safe public access paths.
- Middleware origin/referer checks are documented as CSRF-style filtering only, not tenant authorization.

## Hardened routes

- Admin/global writes now require platform admin:
  - `/api/admin/industries`
  - `/api/blog-posts` mutations and `?all=1`
  - `POST /api/cities`
  - `/api/email/test`
  - `/api/email/welcome`
  - `/api/business/sync-modules`
- Admin login now uses the shared in-memory rate limiter on `/api/auth/login`.
- Ecommerce management routes now derive tenant scope from the business session:
  - `/api/ecommerce/products`
  - `/api/ecommerce/categories`
  - `/api/ecommerce/coupons`
  - `/api/ecommerce/customers`
  - `/api/ecommerce/orders`
  - `/api/ecommerce/settings`
  - `/api/ecommerce/dashboard`
  - `/api/ecommerce/analytics`
- Beauty panel routes now derive tenant scope from the business session:
  - `/api/beauty/settings`
  - `GET` and `PUT` on `/api/beauty/appointments`
- Hotel management routes now derive tenant scope from the business session and apply business filters on raw ID mutations:
  - `GET /api/hotel/requests`
  - `/api/hotel/requests/[id]/complete`
  - `/api/hotel/requests/[id]/cancel`
  - `GET /api/hotel/room-service-orders`
  - `/api/hotel/room-service-orders/[id]`
  - `/api/hotel/room-types`
  - `/api/hotel/room-types/[id]`
  - `/api/hotel/rooms/[id]/status`

## Intentionally public routes

- `GET /api/blog-posts` remains public for published content.
- `GET /api/cities` remains public.
- `POST /api/beauty/appointments` remains public booking creation, but only uses `businessId` as a lookup key.
- `POST /api/hotel/requests` remains public guest request creation, but now validates that the room belongs to the target business.
- `POST /api/hotel/room-service-orders` remains public guest order creation, but now validates that the room belongs to the target business.
- `GET /api/public/ecommerce-settings` was added so the public ecommerce sheet does not depend on the protected management settings API.
- Safe discovery reads remain public:
  - `/api/kesfet`
  - `/api/kesfet/search`
  - `/api/kesfet/categories`

## Temporarily disabled pending customer auth

- `/api/kesfet/orders`
- `/api/kesfet/reservations`
- `/api/kesfet/wallet`
- `/api/kesfet/user/profile`
- `/api/kesfet/user/favorites`

These routes now return `501` with code `CUSTOMER_AUTH_NOT_READY`.

## Remaining backlog

- Replace legacy owner/staff/admin/consultant cookies with the planned Logto identity flow.
- Move tenant membership and route authorization onto the PostgreSQL tenancy tables introduced on `foundation/postgres-logto-tenancy`.
- Normalize remaining tenant-scoped APIs that still parse cookies manually instead of using the shared guard helpers.
- Add route-level tests for cross-tenant denial once a stable API test harness exists.

## Next recommended branch

- `foundation/logto-customer-auth`
  - add a real customer session model for `/kesfet`
  - re-enable the disabled customer routes behind trusted auth only
