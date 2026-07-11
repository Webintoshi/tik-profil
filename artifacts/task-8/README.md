# Task 8 Visual Baselines

This directory contains 33 deterministic Chromium PNG baselines used by `apps/mobile/scripts/task8-browser-regression.mjs`.

Coverage:

- 18 light/dark surface cases for Home, Explore, Favorites, signed-in Account, signed-out Account, profile, menu, product modal, and checkout.
- 3 navigation geometry cases at 360x800, 390x844, and 430x932.
- Keyboard focus and reduced-motion pressed states.
- 160% and 200% Account text, plus 200% Favorites and Explore text.
- Light/dark sparse and grouped Favorites, plus light/dark sparse Explore.

Comparison policy:

- PNGs are decoded to RGBA pixels with `pngjs`.
- Per-channel differences of 12 or less are treated as antialias noise.
- A case fails when more than 0.5% of pixels change or mean channel delta exceeds 1.
- Two screenshots from the same rendered state must differ by at most 0.05% of pixels and 0.1 mean channel delta before baseline comparison.
- Failure output is written to `artifacts/task-8/diffs/<case>-actual.png` and `<case>-diff.png`.

Regenerate intentionally after reviewing a visual change:

```powershell
npm --prefix apps/mobile run test:browser:task8:update
```

Normal comparison:

```powershell
npm --prefix apps/mobile run test:browser:task8
```
