# Logto Netgsm Phone Registration Design

## Goal

Replace the mobile customer's username-based Logto registration with a Turkish phone-number and SMS verification-code flow, while preserving username/password sign-in for existing web business users and correcting the hosted form's layout drift.

## Architecture

- Logto remains the identity authority and generates/validates verification codes.
- The official Logto HTTP SMS connector calls `POST https://tikprofil.com/api/auth/logto/sms`.
- The Tik Profil endpoint validates a dedicated bearer secret, validates the Logto payload, normalizes a Turkish mobile number, creates Turkish copy for the Logto usage type, and sends it through Netgsm's OTP REST endpoint.
- Netgsm credentials and the webhook bearer secret remain server-only Coolify environment variables. They are never sent to the mobile app or stored in Logto custom CSS.
- Mobile Authorization Code + PKCE requests use `first_screen=identifier:register&identifier=phone` for registration and `first_screen=identifier:sign-in&identifier=phone` for sign-in. `ui_locales=tr-TR` keeps the default country code and copy aligned with Turkey.

## Compatibility

- Global Logto sign-up identifier becomes Phone number with required verification.
- Global sign-in retains Username + Password for existing web users and adds Phone number + Verification code.
- Mobile requests explicitly select the phone identifier, so mobile users do not see username fields.
- The connector is configured only after the webhook is deployed and its health contract is verified. This prevents a live registration outage.

## Webhook Contract

Accepted body:

```json
{
  "to": "+905551112233",
  "type": "Register",
  "payload": { "code": "123456" }
}
```

Supported usage types are `Register`, `SignIn`, `ForgotPassword`, and `Generic`. Unsupported shapes return `400`, missing/incorrect bearer authorization returns `401`, missing server configuration returns `503`, and Netgsm rejection returns `502`. Successful Netgsm acceptance returns `204`.

## Visual Direction

- Keep the amber logo and Jost typography.
- Let Logto own input dimensions, borders, floating labels, country selector, and validation layout.
- Remove custom native-input geometry that currently creates a 46 px input inside Logto's 44 px field wrapper.
- Reduce the card's forced minimum height from 540 px to a compact responsive height while retaining enough room for the phone-code step.
- Use amber only for the primary action and focus accent; retain warm white surfaces and high-contrast ink.

## Verification

- Unit tests cover bearer validation, payload validation, Turkish phone normalization, usage-specific SMS copy, Netgsm request mapping, and provider errors.
- Mobile auth tests assert the exact `first_screen`, `identifier`, and `ui_locales` parameters.
- Branding tests ensure the CSS no longer overrides Logto input geometry and keeps the responsive card contract.
- TypeScript, root webhook tests, mobile unit tests, Expo web export, and a real hosted Logto registration render check run before completion.
