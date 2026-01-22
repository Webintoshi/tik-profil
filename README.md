# Tık Profil v2 - Antigravity Rebirth

A high-end, multi-tenant service ecosystem built with Next.js 15, TypeScript, Tailwind CSS, and Framer Motion.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

```
tikprofil-v2/
├── src/
│   ├── app/
│   │   ├── (dashboard)/           # Admin dashboard routes
│   │   │   ├── admin/
│   │   │   │   ├── businesses/    # Business management
│   │   │   │   │   ├── new/       # Add business wizard
│   │   │   │   │   └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── business/          # Industry modules
│   │   │   │   ├── hotels/
│   │   │   │   ├── restaurants/
│   │   │   │   ├── fastfood/
│   │   │   │   ├── petshops/
│   │   │   │   ├── realestate/
│   │   │   │   ├── gyms/
│   │   │   │   ├── salons/
│   │   │   │   └── clinics/
│   │   │   └── layout.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── admin/
│   │   │   └── BusinessTable.tsx
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── GlassCard.tsx
│   │   │   ├── PageHeader.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── StatusBadge.tsx
│   │   └── wizard/
│   │       ├── steps/
│   │       │   ├── Step1Identity.tsx
│   │       │   ├── Step2Package.tsx
│   │       │   ├── Step3Capabilities.tsx
│   │       │   └── Step4Review.tsx
│   │       ├── WizardNavigation.tsx
│   │       ├── WizardProgress.tsx
│   │       └── WizardProvider.tsx
│   ├── lib/
│   │   ├── data.ts
│   │   └── modules/
│   │       └── registry.ts
│   └── types/
│       └── index.ts
├── tailwind.config.ts
├── next.config.ts
└── package.json
```

## Features

- **Apple Dark Mode Aesthetic**: Glassmorphism UI with blur effects
- **Framer Motion Animations**: Smooth page transitions and micro-interactions
- **4-Step Business Wizard**: Identity → Package → Capabilities → Review
- **Industry Module System**: Lazy-loaded modules for different business types
- **High-Density Data Table**: Searchable, sortable business listing
- **Real-time Validation**: Slug availability checking with visual feedback

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (Strict mode)
- **Styling**: Tailwind CSS with custom Apple palette
- **Animations**: Framer Motion
- **Icons**: Lucide React
