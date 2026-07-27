# Business Logto Pilot Design

## Goal

Provision every approved scraper business with a unique Logto owner account, but release the capability only after one reversible Ordu petshop pilot passes identity, credential, activation, panel, discovery, and rollback checks.

## Decisions

- Scraping and account creation remain separate stages. Discovery never creates credentials.
- A candidate must have a Google Place ID, city, district, address, and Turkish mobile phone before approval.
- Admin approval starts an idempotent provisioning saga that creates exactly one business, Logto user, app user, owner role, membership, account issuance, and public discovery profile.
- Login aliases use the existing deterministic `business-slug@tikprofil.com` allocation with district and stable suffix collision fallbacks.
- Initial passwords are random, 16 characters, and shown only in the immediate admin response. They are never persisted in plaintext.
- The Logto user remains suspended until the admin explicitly acknowledges that the matching credential generation was delivered.
- First login forces a password change and verifies the imported business phone with a six-digit Netgsm OTP. The verified phone is the recovery channel.
- Profiles without a paid module do not receive ordering, reservation, or other premium actions.

## Architecture

1. Google Places discovery writes or refreshes an import candidate and source facts.
2. Admin review approves, rejects, or marks a candidate as a duplicate.
3. Provisioning runs under a database advisory lock and records each saga step.
4. Logto Management API creates a suspended user marked with the import candidate ID.
5. PostgreSQL binds the exact Logto subject to the app user, owner role, business membership, and account issuance.
6. Public profile publication happens only after identity and credential issuance succeed.
7. Credential delivery acknowledgement validates the generation and unsuspends the exact bound Logto user.
8. First login is gated to account activation. A new password and phone OTP are required before `/panel` access.

## Pilot Boundary

- Select exactly one existing Ordu petshop that has a Place ID, phone, location, no active owner membership, and no Logto provider link.
- Create no accounts for the remaining businesses during the pilot.
- Keep the pilot account suspended until its one-time credential is deliberately acknowledged.
- Do not send a live OTP to a real business without explicit action-time authorization for that recipient.
- Rollback must suspend/delete the pilot Logto user, revoke its membership, and hide only the pilot public profile without affecting scraper facts or other businesses.

## Failure Handling

- Repeated provisioning returns the existing published result and never returns a second password.
- Identity conflicts fail before password mutation and keep the Logto user suspended.
- Interrupted password responses rotate to a new known credential on retry.
- Invalid or expired OTP attempts do not activate the membership; resend and attempt limits are enforced server-side.
- Missing provider configuration fails closed before any public profile is changed.

## Acceptance Criteria

- Focused unit and integration tests pass for aliasing, saga idempotency, credential delivery, phone OTP, activation gate, and rollback.
- Root typecheck and production build pass.
- Production preflight confirms migrations and required secret names without printing values.
- The pilot produces one Logto user, one app user, one owner role, one active membership, and one account issuance.
- Before delivery acknowledgement the account cannot sign in; after acknowledgement it reaches activation, not `/panel`.
- After OTP activation it reaches only its own `/panel` data.
- Re-running the pilot creates no duplicate records.
- Rollback removes the pilot from public/mobile discovery and blocks its login.

