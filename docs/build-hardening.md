# Build Hardening

- `output: "standalone"` is now part of the branch foundation so the existing `start` script matches Next.js build output.
- The current build still ignores TypeScript and ESLint failures in `next.config.ts`; that behavior should remain temporary until the codebase is cleaned up.
- The new `typecheck` and `lint:strict` scripts are intended to become required CI gates before production deploys.
- The target production pipeline should eventually fail on `npm run typecheck`, `npm run lint:strict`, and `npm run build`.
