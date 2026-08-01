# Business Logto Sign-in Redesign

Date: 2026-08-01

## Objective

Make business account sign-in feel like a native part of Tik Profil while preserving Logto's hosted OIDC security model. The flow must be shorter, visually consistent, and suitable for credentials delivered to imported businesses.

## Confirmed Scope

- Business sign-in only. Customer mobile phone OTP and platform admin sign-in remain separate.
- Keep Logto Authorization Code + PKCE and the existing PostgreSQL membership resolution.
- Replace the normal `/giris-yap` intermediate screen with an immediate server-side handoff to the Logto authorization endpoint.
- Keep a small Tik Profil recovery screen only for logout confirmation and authentication errors.
- Configure the Tik Profil Web Logto application with app-level branding and custom CSS.
- Show only business identifier and password authentication.
- Hide self-registration, Google sign-in, and other consumer-facing choices from the business application.
- Keep all Logto validation, lockout, password recovery, and error states usable.
- Do not expose application internals, PostgreSQL membership details, canary wording, or Logto implementation language to business users.

## Experience Design

### Entry Flow

1. A business opens `https://tikprofil.com/giris-yap`.
2. When no `authError` or logout result is present, the page immediately starts `/api/auth/logto/sign-in?actor=business&callbackUrl=/panel/profile` using a document navigation.
3. Logto renders the branded business sign-in form.
4. A successful login returns directly to `/panel/profile`.
5. A failed mapping or authorization result returns to a compact Tik Profil error screen with a single `Tekrar dene` action.

This removes the current extra `Logto ile devam et` click without bypassing Logto or weakening OIDC state and PKCE validation.

### Logto Form

- Tik Profil wordmark at the top.
- Heading: `Isletme hesabina giris yap`.
- Supporting copy: `Profilinizi ve isletme bilgilerinizi yonetin.`
- Identifier label: `Isletme e-postasi veya kullanici kodu`.
- Password label: `Sifre`.
- Primary action: `Giris yap`.
- Password visibility remains available.
- Registration and Google sign-in are not shown for this business application.
- `Powered by Logto` is hidden when the installed Logto edition supports the setting; otherwise it is visually de-emphasized without breaking policy or accessibility.

### Visual Language

- Primary amber: `#FFB347`.
- Primary pressed/hover: `#F6A52F`.
- Warm canvas: `#FAF8F4`.
- Surface: `#FFFFFF`.
- Primary text: `#211A12`.
- Muted text: `#6F665C`.
- Border: `#E7DED3`.
- Error: `#C93D36` with a pale warm-red surface.
- Focus ring: two-pixel amber ring with sufficient contrast; no purple or blue outlines.
- Typography: Jost where a stable public font asset is available, then a system sans fallback.
- Layout: one centered, restrained form surface; no gradients, decorative orbs, oversized illustrations, or marketing copy.
- Mobile target: comfortable at 360-430 px widths without clipped labels, overlapping inputs, or horizontal scrolling.
- Desktop target: the same focused form with a maximum readable width; no split-screen marketing panel.

## Credential Usability

The first implementation does not silently rename existing Logto users. Authentication remains keyed by the current Logto user identity and PostgreSQL provider link.

For newly provisioned businesses, a follow-up migration will generate a short unique identifier such as `akbulut-8f2k@tikprofil.com` instead of a full slug. That migration must include collision handling and must update Logto plus the credential issuance record atomically. It is intentionally separated from the visual rollout to avoid locking out existing accounts.

Temporary passwords remain one-time delivery credentials. A forced first-login password-change flow requires a dedicated Account API design and is not faked in CSS or implemented by weakening password policy.

## Implementation Boundaries

### Tik Profil application

- Refactor the business Logto entry page into automatic redirect and recovery variants.
- Preserve the current document-navigation behavior and callback target.
- Replace implementation-oriented error copy with business-facing Turkish copy.
- Add focused tests for direct entry, error recovery, logout recovery, and callback target preservation.

### Logto application

- Use app-level sign-in experience settings for app ID `0w7m8qz5rkx02l7dxpbza`.
- Upload the Tik Profil wordmark and favicon.
- Apply the amber brand color and custom CSS at application level so other Logto applications are not unintentionally restyled.
- Disable business-app self-registration and consumer social sign-in choices.
- Keep password authentication enabled.
- Apply Turkish phrase overrides where Logto exposes stable localization keys.

### Deployment and rollback

1. Capture the current Logto sign-in experience configuration.
2. Deploy and verify the Tik Profil application redirect/recovery change.
3. Apply Logto app-level branding and authentication method settings.
4. Run production smoke tests at mobile and desktop widths.
5. Test success, invalid password, unknown identity, logout, and direct panel access.

Rollback restores the captured Logto app configuration and reverts the Tik Profil application commit. No database schema change is required.

## Error Handling

- Configuration or OIDC discovery failures render a branded recovery screen, never an infinite redirect loop.
- Access or membership mapping failures explain that the account is not connected to a business and provide a retry path.
- Suspended accounts remain blocked by Logto.
- The recovery page never prints provider IDs, database terminology, environment variable names, or stack details.

## Verification

- Unit tests for business sign-in entry behavior and error states.
- Production build and relevant auth tests.
- Browser verification at approximately 390 x 844 and 1440 x 900.
- DOM check for exactly one primary login action and no business registration or Google action.
- Visual check for Tik Profil logo, amber focus/primary states, stable input geometry, and no horizontal overflow.
- Interaction check for failed login, successful pilot login, callback to `/panel/profile`, logout, and blocked direct panel access.
- Console check for relevant errors and warnings.

## Explicit Non-goals

- Replacing Logto with a custom authentication backend.
- Changing customer Netgsm OTP or native Google sign-in.
- Implementing Apple sign-in.
- Bulk-renaming existing business login aliases in the same rollout.
- Reintroducing the removed account activation page.
