# Cleanup Audit

## Safe cleanup pass 1

This pass removes only confirmed-unused legacy targets and avoids any runtime, infra, deployment, or data-layer changes.

### Removed in this pass

- `public/manifest-panel.json`
  - no repository references were found
  - pointed to missing `icon-panel-*.png` assets
  - active manifests remain `public/manifest.json` and `public/manifest-admin.json`
- `src/lib/modules/registry.ts`
  - no repository imports were found
  - active module registry remains `src/lib/ModuleRegistry.ts`

### Documented but intentionally not removed

- `src/app/api/debug/*`
  - kept for manual review, not part of the safe deletion pass
- `src/app/api/email/test/route.ts`
  - kept for manual review, not part of the safe deletion pass
- `src/app/api/email/welcome/route.ts`
  - kept for manual review, not part of the safe deletion pass
- `/kesfet`
  - kept until real customer authentication exists for stateful customer flows
- `/kesfet-v2`
  - kept for manual review because related routes/components appear incomplete
- `public/manifest.json`
  - active main app PWA manifest
- `public/manifest-admin.json`
  - active admin PWA manifest
- `public/sw.js`
  - active service worker used by the current PWA registration flow

### Manual-review candidates

- `src/app/api/debug/*`
- `src/app/api/email/test/route.ts`
- `src/app/api/email/welcome/route.ts`
- `/kesfet-v2` related incomplete routes/components

### Deprecated but kept

- `start:legacy`
  - retained for compatibility during the current deployment transition
- `AUTH_PROVIDER=legacy`
  - retained until the auth cutover is completed
- `/kesfet` customer stateful routes
  - retained but blocked on real customer authentication

### Local artifacts

- `.next/`, `node_modules/`, and `.next-start-kesfet.log` are local artifacts and are intentionally not committed in this pass
