I have analyzed the request. The goal is to bring the "World to T Logo" animation (`QRWorldAnimation`) from the homepage hero section to the `kesfet` page and update the `kesfet` page's theme to match the homepage.

Although I could not locate the exact HTML structure of the selected element in the codebase (it might be dynamic or from a different context), I will place the animation in a prominent "Hero" section at the top of the `kesfet` page, mimicking the homepage's style as requested.

### Plan: Update Kesfet Page with Hero Animation and Theme

1.  **Update Page Theme (`src/app/kesfet/page.tsx`)**
    *   Modify the main container's `className` to match the homepage's gradient and text styles.
    *   Replace: `bg-[#F2F4F8] bg-[radial-gradient(...)]`
    *   With: `bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100 text-slate-800 selection:bg-blue-500/20 selection:text-blue-900 overflow-x-hidden`

2.  **Integrate `QRWorldAnimation`**
    *   Import `QRWorldAnimation` from `@/components/landing/QRWorldAnimation`.
    *   Create a new Hero section at the top of the `<main>` content (before `StoriesBar`).
    *   This section will be a centered container (matching the selected element's structure: `relative z-10 flex flex-col items-center...`) with a defined height (e.g., `h-[400px]`) to host the animation.
    *   Apply "glassmorphism" styles (backdrop blur, border) to the animation container to match the homepage's design language.

3.  **Refine Layout**
    *   Ensure the new Hero section blends seamlessly with the existing `StoriesBar` and `BusinessTypesBar`.
    *   Verify that the `QRWorldAnimation` resizes correctly within its new container.

I will proceed with these changes to `src/app/kesfet/page.tsx`.