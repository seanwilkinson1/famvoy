# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
npm run dev          # Start dev server (Express + Vite HMR on port 5000)
npm run build        # Production build (Vite client → dist/public/, esbuild server → dist/index.cjs)
npm run start        # Run production build (NODE_ENV=production node dist/index.cjs)
npm run check        # TypeScript type checking (tsc --noEmit)
npm run db:push      # Push Drizzle schema changes to PostgreSQL
```

There is no test suite configured.

## Architecture

Full-stack TypeScript monorepo hosted on Replit. Single Express server serves both the API (`/api/*`) and the React SPA.

### Three-layer structure

- **`client/`** — React 19 SPA built with Vite. Uses Wouter for routing, TanStack Query for server state, shadcn/ui (Radix + Tailwind v4) for components, Clerk for auth.
- **`server/`** — Express 4 API. All routes defined in `server/routes.ts` (~5k lines). Auth via Clerk middleware (`requireAuth()`). Database access through Drizzle ORM.
- **`shared/schema.ts`** — Single file containing all Drizzle table definitions (~40 tables), Zod insert schemas (`createInsertSchema`), and TypeScript types. This is the source of truth for the database schema and shared types.

### Path aliases

```
@/*       → client/src/*
@shared/* → shared/*
@assets   → attached_assets/
```

### Key architectural patterns

- **API client**: `client/src/lib/api.ts` is a centralized object with methods for every endpoint. Clerk tokens are injected via `setAuthTokenGetter()` in `App.tsx`.
- **Auth flow**: Unauthenticated users see `Landing.tsx`. Authenticated users without a profile go to `Onboarding.tsx`. All other routes are behind `SignedIn`.
- **Admin pages**: Separate route group at `/admin/*` with their own layout (no bottom nav/sidebar).
- **Agent pages**: `/agent/*` routes for concierge agents who handle booking requests.
- **Mobile-first layout**: `BottomNav` for mobile, `Sidebar` for desktop. `PullToRefresh` wraps most content. Max-width container (`max-w-md`) on mobile.

### Database

PostgreSQL via Drizzle ORM. Schema uses serial integer PKs, `defaultNow()` timestamps, PostgreSQL text arrays for lists (interests, familyValues, languages), and JSONB for flexible metadata.

Key entity relationships:
- Users → FamilyMembers (one-to-many)
- Pods → PodMembers → Users (many-to-many)
- PodTrips → TripDestinations → TripItems → TripItemOptions
- Trip confirmation: `tripConfirmationSessions` tracks wizard state, items go through `pending` → `locked`/`skipped`
- Booking: BookingOptions → CartItems → OrderItems (with Stripe integration)
- Concierge: ConciergeRequests → ConciergeRequestItems, with AI chat via ConciergeBookingSessions

### External services

- **Clerk** — Authentication (social login, session management)
- **Stripe** — Payments (checkout sessions, webhooks via `stripe-replit-sync`)
- **OpenAI** (GPT-4o-mini) — AI-generated booking options in trip confirmation
- **Google Places API** — Location search, photo proxy at `/api/places/photo`
- **Google Cloud Storage** — File uploads via presigned URLs (`objectStorage.ts`)

### Design system

Warm color palette with CSS custom properties: `--warm-teal` (primary), `--warm-coral` (secondary), `--warm-cream` (background). Fonts: Fraunces (display/serif) + Plus Jakarta Sans (body). Animations via Framer Motion.
