# Toshi Groq discovery pilot — 2026-09-08

This branch starts from the running production revision 8d2c004032148727bf8693984fb182bf8a9968b1. It contains the discovery/chat endpoint only; no database migration, mobile UI release, account mutation tool, or transaction tool is included.

## Runtime configuration

Set secrets in the server environment only, never EXPO_PUBLIC variables or build arguments:

- GROQ_API_KEY: rotated Groq key, runtime only
- REDIS_URL: existing private Redis connection
- TOSHI_GROQ_ENABLED=true
- TOSHI_360_DISCOVERY_ENABLED=true
- TOSHI_360_TEST_ACCOUNT_IDS: verified appUserId values, comma separated
- TOSHI_360_TEST_ACCOUNT_EMAILS: optional verified account emails, read from app_users only after native session validation
- TOSHI_360_PUBLIC_DISCOVERY_ENABLED=false during pilot

The runtime verifies existing native customer sessions. Guest access requires the explicit public discovery flag. Personal and transaction capabilities are always false in this release. Protocol 1 remains compatible with deterministic discovery.

## Limits and failure behavior

Requests are capped at 48,000 bytes while reading the stream. The default HTTP guest quota is shared: 20 requests/minute. Do not configure TOSHI_TRUSTED_IP_HEADER unless the edge overwrites that header and the origin cannot be reached directly; user-agent and arbitrary forwarding headers are not trusted.

Groq budgets use atomic Redis reservations: 20 calls/minute, 800/day, 20/hour per verified owner (guests share a scope), and 180,000 conservative input-byte-plus-output reservations/day. This last counter is deliberately not actual billable tokens. Two concurrent requests are allowed per server process. Redis failure disables model calls in production. Provider or quota failures use the limited command fallback, identified by source=fallback.

Only allowlisted discovery tools are passed to the model; no credentials, account tools or order-writing tools are offered. Business identifiers and references are checked against retrieved records. These safeguards do not establish perfect answer accuracy.

## Validation

- 30 adapter, source, command and security tests passed; five additional native-auth/pilot access regression tests passed.
- Production npm ci and npm run build succeeded against the existing lockfile.
- Whole-project tsc reports pre-existing errors outside Toshi. No Toshi/conversation-language errors remain after removing an unused personal repository type dependency. Existing Next type/lint skip settings were not changed.
- Android 2.0.50 (52) emulator preview reached a loopback guest-discovery server. Real Groq greeting completed in 930 ms and coffee search in 2,747 ms, returning actual public business cards. This is a local preview, not proof of deployed production availability.
- Production Redis integration, authenticated production smoke test, and independent 90% conversation evaluation remain rollout gates. Do not enable public discovery until these gates pass.
- iOS device testing was not performed on Windows.

## Rollback

Disable TOSHI_GROQ_ENABLED to use limited commands. Disable TOSHI_360_DISCOVERY_ENABLED to close the pilot. Previous production commit is recorded above. No schema rollback is required.
