# Tenant Security Plan

## Foundation rule

Protected APIs must derive actor identity and tenant identity from server-side authentication and authorization state. Request-supplied identifiers such as `businessId`, `userId`, query string tenant selectors, or `x-user-id` headers are not trusted as authority.

## Target responsibilities

- Logto will act as the external identity provider once introduced.
- PostgreSQL will become the internal source of truth for authorization and membership.
- Session-to-tenant resolution must happen on the server for every protected request.

## Target foundation tables

- `app_users`
- `auth_provider_links`
- `platform_admins`
- `business_memberships`
- `business_roles`
- `module_access`
- `business_claims`
- `audit_events`

## High-risk API groups to harden first

- Ecommerce owner APIs that currently trust request `businessId`
- Beauty appointment APIs that currently trust request `businessId`
- Hotel request APIs that currently trust request `businessId`
- Discovery and customer APIs that currently rely on `x-user-id`
- Blog content APIs that currently use owner/staff auth instead of admin-only authorization
- City management APIs that currently allow unauthenticated file writes

## Migration principle

- Keep Supabase-backed runtime behavior stable while the foundation layer is introduced.
- Add canonical PostgreSQL authorization tables first.
- Move risky APIs to server-derived tenant checks before expanding product scope.
