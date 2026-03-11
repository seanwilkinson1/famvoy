# FamVoy UI Redesign — Kindred Design Language

**Type:** Feature (major redesign)
**Date:** 2026-03-11
**Status:** Draft
**Scope:** Full client-side UI overhaul + new trip planner pages + Trip Mode + data model alignment

---

## Overview

Redesign FamVoy's entire UI to follow the Kindred (LiveKindred) design language: a premium, editorial, trust-focused aesthetic with near-monochrome palette, pill-shaped interactive elements, serif + sans-serif typography, generous whitespace, and progressive disclosure wizards. Simultaneously implement the trip planner PRD (Pre-Trip wizard, Trip Mode, Post-Trip Booklet) using the new design system.

## Problem Statement

FamVoy's current UI has accumulated inconsistencies from rapid feature development:
- **3 icon libraries** (Lucide, Phosphor, custom SVGs) with no standard
- **Hardcoded colors** (`bg-gray-50`, `text-charcoal`, `bg-soft-beige`) alongside CSS tokens
- **Inconsistent container widths** (`max-w-md`, `max-w-2xl`, `max-w-4xl`, `max-w-6xl`)
- **Mixed modal patterns** (`createPortal`, shadcn Dialog, Framer Motion overlays)
- **Mixed border radii** (`rounded-xl`, `rounded-2xl`, `rounded-3xl`)
- **Mixed button styles** (shadcn Button, inline styled buttons, raw `<button>`)
- **Two toast systems** (Sonner and Radix `useToast`)
- **BottomNav vs Sidebar** show different nav items
- The trip planner is a bare modal — no wizard, no AI generation, no Trip Mode

## Proposed Solution

A phased migration applying the Kindred design system across the app, with the trip planner PRD implemented as the flagship feature of the new design. Seven phases, each independently deployable.

---

## Phase 0: Design Token Foundation

**Goal:** Replace CSS custom properties with Kindred tokens. Zero visual breakage initially — update token values so existing `bg-primary`, `text-foreground` etc. automatically adopt the new palette.

### Color Token Migration Map

| Current Token | Current Value | New Value | Kindred Equivalent |
|---|---|---|---|
| `--primary` | `168 55% 38%` (teal) | `220 15% 13%` | Near-black `#1A1A1A` |
| `--primary-foreground` | `168 55% 98%` | `0 0% 100%` | White |
| `--secondary` | `12 76% 61%` (coral) | `0 0% 82%` | Light gray `#D0D0D0` |
| `--secondary-foreground` | `12 76% 10%` | `220 15% 13%` | Near-black |
| `--background` | `40 33% 96%` (cream) | `30 18% 95%` | Off-white `#F5F3F0` |
| `--card` | `40 30% 99%` | `0 0% 100%` | White |
| `--foreground` | `220 20% 18%` | `220 15% 13%` | Near-black `#1A1A1A` |
| `--muted` | `40 20% 92%` | `30 10% 92%` | Light gray area |
| `--muted-foreground` | `220 10% 50%` | `0 0% 61%` | Medium gray `#9B9B9B` |
| `--border` | `40 20% 88%` | `0 0% 91%` | Light gray `#E8E8E8` |
| `--accent` | `168 40% 94%` | `145 45% 36%` | Kindred green `#2D8B4E` |
| `--destructive` | `0 72% 51%` | keep | Error red |

**New brand tokens to add:**

```css
--kindred-green: 145 45% 36%;     /* #2D8B4E — trust, verification, availability */
--kindred-blue: 211 100% 50%;     /* #007AFF — notifications, system links */
--kindred-cream: 30 18% 95%;      /* #F5F3F0 — section backgrounds */
```

### Files to modify

- [x] `client/src/index.css` — Update `:root` token values, remove `.bg-warm-gradient` / `.bg-teal-gradient` / `.bg-coral-gradient`, update `.card-shadow` from teal RGBA to neutral, remove `.grain-overlay`
- [x] `client/src/index.css` — Update `@theme inline` to add `--color-kindred-green`, `--color-kindred-blue`
- [x] Audit and fix all hardcoded color classes across components (search for `bg-gray-`, `text-charcoal`, `bg-soft-beige`, `text-warm-teal`, `bg-coral`)

### Typography — Keep Current

- **Fraunces** (serif display) — already serves the same role as Kindred's Playfair Display
- **Plus Jakarta Sans** (body) — already serves the same role as Kindred's Inter
- No font changes needed. Adjust sizes in Phase 1 components.

### Border Radius System

Replace single `--radius: 1.25rem` with context-specific values:

```css
--radius-sm: 0.5rem;    /* 8px — small elements */
--radius-md: 0.75rem;   /* 12px — cards, panels */
--radius-lg: 1rem;      /* 16px — large cards, modals */
--radius-xl: 1.5rem;    /* 24px — hero cards */
--radius-pill: 9999px;  /* pill buttons, chips, tags, toggles */
```

### Acceptance Criteria

- [x] All existing pages render without visual breakage after token swap
- [x] `npm run check` passes (TypeScript compiles)
- [x] No hardcoded colors remain outside `index.css`

---

## Phase 1: Core Component Library

**Goal:** Create reusable Kindred-styled base components. These become the building blocks for all subsequent phases.

### 1.1 Button Variants

**File:** `client/src/components/ui/button.tsx`

Add pill variants to CVA config:

```tsx
size: {
  default: "min-h-9 px-4 py-2",
  sm: "min-h-8 rounded-md px-3 text-xs",
  lg: "min-h-10 rounded-md px-8",
  pill: "min-h-12 rounded-full px-6 py-3 text-[15px] font-medium",
  "pill-sm": "min-h-9 rounded-full px-4 py-2 text-sm font-medium",
  "pill-lg": "min-h-14 rounded-full px-8 py-4 text-base font-medium",
  icon: "h-9 w-9",
},
```

Primary pill = `bg-[#1A1A1A] text-white` (near-black filled).
Secondary pill = `border border-[#D0D0D0] bg-transparent` (outlined).

### 1.2 New Components to Create

| Component | File | Description |
|---|---|---|
| `FilterChip` | `client/src/components/ui/filter-chip.tsx` | Pill-shaped toggle chip with optional icon. Active: dark fill. Inactive: light border. |
| `SegmentedToggle` | `client/src/components/ui/segmented-toggle.tsx` | Horizontal option group in rounded container. Active segment has white bg + shadow. |
| `ProgressRing` | `client/src/components/ui/progress-ring.tsx` | Thin SVG circular arc. Determinate: fraction of steps. Black stroke, light gray track. |
| `ImageCarousel` | `client/src/components/shared/ImageCarousel.tsx` | Embla-based carousel with dot indicators, lazy-loaded images. Swipe on mobile, arrows on desktop hover. |
| `AvailabilityTag` | `client/src/components/ui/availability-tag.tsx` | Green outlined pill for dates/status. |
| `VerificationBadge` | `client/src/components/ui/verification-badge.tsx` | Small green checkmark next to verified member names. |
| `StickyFooter` | `client/src/components/ui/sticky-footer.tsx` | Fixed-bottom bar with summary + CTA. For wizards. |
| `StepperControl` | `client/src/components/ui/stepper-control.tsx` | Label + minus/number/plus for counts (guests, bedrooms). |

### 1.3 Standardize Icons

Consolidate to **Lucide only** (already the shadcn/ui default):

- [ ] Replace all `@phosphor-icons/react` imports with Lucide equivalents
- [ ] Replace custom `NavIcons.tsx` SVGs with Lucide icons (or keep custom if they're specifically designed for the nav)
- [ ] Remove `@phosphor-icons/react` from `package.json`

### 1.4 Standardize Toasts

Pick **one** toast system — Sonner (already shadcn default in newer versions):

- [ ] Replace all `useToast()` (Radix) calls with `toast()` (Sonner)
- [ ] Remove `@/components/ui/toast.tsx` and `@/components/ui/toaster.tsx` (Radix versions)
- [ ] Update `App.tsx` to use Sonner's `<Toaster>` only

### Acceptance Criteria

- [ ] All new components created and functional
- [ ] Phosphor icons fully removed
- [ ] Single toast system (Sonner) in use
- [ ] Existing pages still render correctly

---

## Phase 2: Navigation Overhaul

**Goal:** Redesign BottomNav and Sidebar to match Kindred patterns.

### 2.1 Mobile Bottom Nav (5 tabs with center "+")

**File:** `client/src/components/layout/BottomNav.tsx`

New tab layout:

| Position | Tab | Icon (Lucide) | Route |
|---|---|---|---|
| 1 | Home | `Home` | `/` |
| 2 | Explore | `Search` | `/explore` |
| 3 (center) | Create | `Plus` | Action sheet |
| 4 | Trips | `MapPin` | `/trips` |
| 5 | Profile | `User` | `/profile` |

- Center "+" button: 56px dark circle (`bg-[#1A1A1A]`), elevated above other tabs
- Tapping "+" opens an action sheet (shadcn Sheet from bottom) with options: "Plan a Trip", "Log a Memory", "Create Experience", "Add a Dream"
- Active tab: filled icon + label text. Inactive: outlined icon, no label.
- Notification dot (blue `#007AFF`) on tabs with updates
- Dreams becomes a section within Home feed or accessible from Profile
- Chat moves to a header icon (top-right bell/chat icon)
- Pods accessible from Trips tab as a sub-section

### 2.2 Desktop Sidebar

**File:** `client/src/components/layout/Sidebar.tsx`

Align with mobile nav. Keep sidebar (not Kindred's top nav — FamVoy already has sidebar infrastructure):

- Same 5 nav items as mobile: Home, Explore, Trips, Profile, + Create
- Add Chat and Notifications as header icons
- Restyle: off-white background, pill-shaped active state, Lucide icons

### 2.3 TopHeader

**File:** `client/src/components/layout/TopHeader.tsx`

Simplify to Kindred pattern:
- Left: "FamVoy" wordmark (Fraunces, bold)
- Right: Chat icon + Notification bell with blue dot
- On Explore page: replace with search bar ("Anywhere" + "Anytime" + filter icon)

### 2.4 Remove FloatingActionButton

The center "+" in the BottomNav replaces the FAB.

- [ ] Delete `client/src/components/layout/FloatingActionButton.tsx`
- [ ] Remove FAB reference from `App.tsx`

### Acceptance Criteria

- [ ] BottomNav has 5 tabs with center "+" button
- [ ] "+" opens action sheet with creation options
- [ ] Sidebar matches mobile nav structure
- [ ] FAB removed
- [ ] Dreams, Chat, Pods accessible through new navigation paths

---

## Phase 3: Pre-Trip Planning Wizard (PRD Phase 1)

**Goal:** Implement the 5-step trip planning wizard per the PRD, using Kindred design patterns.

### 3.1 New Routes

Register in `App.tsx`:

```
/trips/new           → TripSetup (Step 1)
/trips/new/style     → TravelStyle (Step 2)
/trips/new/generate  → AIGeneration (Step 3)
/trip/:id/plan       → ItineraryEditor (Step 4)
/trip/:id/finalize   → LockAndShare (Step 5)
```

### 3.2 New Pages

| Page | File | Key Components |
|---|---|---|
| `TripSetup` | `client/src/pages/trip-wizard/TripSetup.tsx` | Name input, Google Places autocomplete, date picker, traveler count steppers, pod selector. Large serif heading: "Where are you headed?" |
| `TravelStyle` | `client/src/pages/trip-wizard/TravelStyle.tsx` | Interest multi-select grid (FilterChip), pace selector (SegmentedToggle), budget selector. Heading: "How do you travel?" |
| `AIGeneration` | `client/src/pages/trip-wizard/AIGeneration.tsx` | Animated loading states with progress text. SSE streaming from `/api/trips/:id/generate_itinerary`. Auto-transitions to Step 4 on complete. |
| `ItineraryEditor` | `client/src/pages/trip-wizard/ItineraryEditor.tsx` | Day tabs, stop cards (color-coded by type), drag-and-drop (dnd-kit), inline AI suggestions, lock/unlock days. |
| `LockAndShare` | `client/src/pages/trip-wizard/LockAndShare.tsx` | Trip summary card, per-day lock status, pod sharing, export options, "Start Trip" CTA. |

### 3.3 Wizard Design Pattern (Kindred-style)

Each step follows this layout:
- **ProgressRing** at top center (thin arc, step X of 5)
- **Large serif heading** centered (Fraunces, 28-32px)
- **Subtitle** in medium gray
- **Content area** with generous padding (20px horizontal)
- **StickyFooter** at bottom: trip summary + "Next" pill button (dark)
- **"Skip" or "Back"** as text link in top-right or secondary outlined pill

### 3.4 Data Model

Use the trip planner PRD model. New tables (already partially in schema from previous work):

- `itineraryDays` — one per trip day
- `tripStops` — ordered stops within each day
- `tripMemories` — logged during Trip Mode
- `tripBooklets` + `bookletChapters` — already exist

**Status enum for `podTrips.status`:** Use the PRD's `"planning" | "active" | "completed" | "booklet_draft" | "published"`. This supersedes the lifecycle plan's approach — the status represents the trip's current phase.

### 3.5 API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/trips` | Create trip (Step 1 data) |
| `PATCH` | `/api/trips/:id` | Update trip fields |
| `PATCH` | `/api/trips/:id/style` | Save travel style (Step 2) |
| `POST` | `/api/trips/:id/generate-itinerary` | Trigger AI generation (SSE streaming) |
| `PATCH` | `/api/trips/:id/days/:dayId` | Update day (lock, label) |
| `POST` | `/api/trips/:id/days/:dayId/stops` | Add stop to day |
| `PATCH` | `/api/trips/:id/stops/:stopId` | Update stop (status, notes, position) |
| `DELETE` | `/api/trips/:id/stops/:stopId` | Remove stop |
| `POST` | `/api/trips/:id/reorder-stops` | Batch reorder stops |

### Acceptance Criteria

- [ ] 5-step wizard navigable with back/forward
- [ ] Each step persists data to server
- [ ] AI generation streams results
- [ ] Itinerary editor supports drag-reorder, add/swap/remove stops
- [ ] Days can be locked/unlocked
- [ ] Wizard state resumes if user navigates away and returns
- [ ] All pages use Kindred design patterns (pill buttons, progress ring, serif headings)

---

## Phase 4: Trip Mode (PRD Phase 2)

**Goal:** Implement the during-trip experience with dark ambient theme, live tracking, and memory logging.

### 4.1 New Routes

```
/trip/:id/live           → TripModeToday (default)
/trip/:id/live/map       → TripModeMap
/trip/:id/live/memories  → TripModeMemories
/trip/:id/live/pod       → TripModePod
```

### 4.2 Trip Mode Layout

**File:** `client/src/pages/trip-mode/TripModeLayout.tsx`

- Dark background: `#0D1117`
- Custom tab bar at bottom (within Trip Mode, NOT the global BottomNav)
- Tabs: Today, Map, Memories, Pod
- Live indicator: pulsing green dot + "Trip Mode · Live" text at top
- Exit button (top-left): returns to `/trip/:id`
- Global BottomNav hidden during Trip Mode

### 4.3 New Pages

| Page | File | Key Pattern |
|---|---|---|
| `TripModeToday` | `client/src/pages/trip-mode/TripModeToday.tsx` | Current stop hero card (name, type, elapsed timer, check-in button), "Up Next" strip with directions button, full day timeline, day progress bar |
| `TripModeMap` | `client/src/pages/trip-mode/TripModeMap.tsx` | Full-screen dark-styled map, stop pins (done=muted, current=green pulse, upcoming=outline), current location, "Open in Maps" button |
| `TripModeMemories` | `client/src/pages/trip-mode/TripModeMemories.tsx` | Chronological feed of memories, highlight toggle (star), "Add Memory" button, booklet preview CTA |
| `TripModePod` | `client/src/pages/trip-mode/TripModePod.tsx` | Pod members list with current location/status, "Message" button, "View Their Day" link, shared moments feed |

### 4.4 Memory Log Bottom Sheet

**Component:** `client/src/components/trip/MemoryLogSheet.tsx`

- Vaul bottom sheet (slides up from bottom)
- Context: "Logging at: [Stop Name]"
- Emoji mood picker (horizontal scroll, 10 options)
- Caption field (multiline, 500 char max)
- Photo attachment (camera/gallery)
- "Save Memory" pill button

### 4.5 Trip Activation

- Trip transitions to `active` when `startDate` is reached OR user taps "Start Trip"
- Server sets `activatedAt` timestamp
- `/trip/:id` page shows "Enter Trip Mode" CTA when trip is active

### 4.6 API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/trips/:id/activate` | Set trip to active |
| `POST` | `/api/trips/:id/complete` | Set trip to completed |
| `POST` | `/api/trips/:id/stops/:stopId/checkin` | Check in at stop |
| `POST` | `/api/trips/:id/memories` | Create memory (with photo upload) |
| `PATCH` | `/api/trips/:id/memories/:memoryId` | Update memory (caption, highlight, tag) |
| `GET` | `/api/trips/:id/memories` | List memories for trip |
| `GET` | `/api/trips/:id/live` | Get live trip state (today's stops, progress) |

### Acceptance Criteria

- [ ] Dark-themed Trip Mode layout scoped to `/trip/:id/live/*` routes
- [ ] Today tab shows current stop, timeline, progress bar
- [ ] Check-in updates stop status and records timestamp
- [ ] Memory log bottom sheet works with keyboard open
- [ ] Map shows stop pins color-coded by status
- [ ] Global BottomNav hidden during Trip Mode
- [ ] Touch targets >= 44px for outdoor use

---

## Phase 5: Explore & Card Redesign

**Goal:** Redesign the Explore page (map + bottom sheet) and all card components.

### 5.1 Explore Page Redesign

**File:** `client/src/pages/Explore.tsx`

**Mobile:**
- Full-screen Google Maps with custom muted styling
- "Search this area" dark pill button (bottom-center), appears after map pan (250ms debounce)
- "Back to list" pill button (top-left) toggles to list view
- Tapping a pin opens Vaul bottom sheet with listing card
- Filter chips at top: horizontal scroll, pill-shaped, Lucide icons

**Desktop:**
- Split view: 45% card list (left, scrollable) + 55% map (right, sticky)
- Hover card highlights map pin
- Click pin scrolls to card
- Sort controls in list pane header

### 5.2 Card Components

**Redesign:** `client/src/components/shared/ExperienceCard.tsx`

New card anatomy (Kindred pattern):
1. Image carousel (ImageCarousel component) with dot indicators
2. Heart/save icon overlay (top-right)
3. Location text (bold, small, uppercase tracking)
4. Title (larger, sans-serif semibold)
5. Metadata row (icons + text: duration, stops, age range)
6. Date tags (green outlined pills)

**Redesign:** `client/src/components/shared/PodCard.tsx`
- Same card shell, pod-specific metadata

**New:** `client/src/components/shared/TripCard.tsx`
- Trip-specific: destination photo, trip name, dates, status badge, stop count

### 5.3 Home Feed Redesign

**File:** `client/src/pages/Home.tsx`

Kindred-inspired sections:
- **Traveling Now** — horizontal scroll of active trip cards with green live indicator
- **Your Trips** — upcoming trip cards with status badges
- **Dream Destinations** — moved from Dreams tab to Home section
- **Recent from Your Network** — completed trips from followed families
- **Discover** — suggested experiences/families
- All sections use `section-title` (Fraunces) + "See all" link

### Acceptance Criteria

- [ ] Explore map view with bottom sheet (mobile) and split view (desktop)
- [ ] "Search this area" pill button with debounced fetch
- [ ] All cards use ImageCarousel with dot indicators
- [ ] Cards follow Kindred anatomy (image, location, title, metadata, tags)
- [ ] Home feed reorganized with Kindred section patterns
- [ ] Filter chips are pill-shaped with icons

---

## Phase 6: Profile, Trust & Onboarding

**Goal:** Add trust signals, verification badges, profile completeness nudges, and redesign onboarding.

### 6.1 Profile Redesign

**File:** `client/src/pages/Profile.tsx`

- Profile photo carousel (Embla) with dot indicators
- Verification badge (green checkmark) next to name
- Bio section with warm, conversational tone guidance
- "Household" section with family member cards (photo, name, role)
- Interest tags with emojis (pill-shaped)
- "Last active X days ago" timestamp
- Profile completeness nudge card (if incomplete)

### 6.2 Verification

- "Verified" = email verified via Clerk (V1, no KYC)
- Display `VerificationBadge` component next to verified names throughout the app
- Add `isVerified` computed field to user API responses (check Clerk email verification status)

### 6.3 Profile Completeness Nudge

Kindred-style nudge card on Profile page:

```
"Take a look. Would this get families excited to travel with you?"
[Preview of your sparse profile]
[CTA: "Complete Profile" (dark pill)]
```

Completeness based on: avatar, bio, location, at least 1 family member, at least 3 interests.

### 6.4 Onboarding Redesign

**File:** `client/src/pages/Onboarding.tsx`

Convert from 3-step form to Kindred single-question-per-step wizard:

| Step | Question (serif heading) | Input |
|---|---|---|
| 1 | "What's your family name?" | Text input |
| 2 | "Where are you based?" | Google Places autocomplete |
| 3 | "Who's in your family?" | Name + age inputs, add more button |
| 4 | "What does your family love?" | Interest multi-select grid (FilterChip) |
| 5 | "Add a family photo" | Photo upload (optional, "Skip" available) |

Each step: ProgressRing at top, serif heading centered, single input, StickyFooter with "Next".

### 6.5 Community Language

Replace throughout codebase:
- "users" → "members" or "families"
- "listing" / "property" → "experience" or "trip"
- UI copy should feel warm and conversational, not transactional

### Acceptance Criteria

- [ ] Verification badge displays for verified users
- [ ] Profile completeness nudge shows for incomplete profiles
- [ ] Onboarding is 5 single-question steps with Kindred design
- [ ] Interest tags use emoji + pill pattern
- [ ] "Last active" timestamp on profiles

---

## Phase 7: Post-Trip Booklet Polish

**Goal:** Polish existing booklet pages to match Kindred editorial aesthetic.

### 7.1 Booklet Cover

**File:** `client/src/pages/booklet/BookletCover.tsx`

- Off-white background (`#F5F3F0`)
- Large serif trip name, subtitle, date range
- Stats row with icons (stops, memories, photos)
- AI reflection with typewriter animation (SSE streaming)
- Chapter preview cards (tappable)

### 7.2 Booklet Chapters

**File:** `client/src/pages/booklet/BookletChapters.tsx`

- Day tab strip with accent colors
- Chapter header: accent-colored background, serif title, location, pull quote
- Hero memory card (full-width, highlighted memory)
- 2-column memory grid below hero
- Prev/Next day navigation

### 7.3 Booklet Publish

**File:** `client/src/pages/booklet/BookletPublish.tsx`

Already exists and is functional. Restyle to use pill buttons and Kindred tokens.

### Acceptance Criteria

- [ ] Booklet pages use off-white backgrounds and Kindred typography
- [ ] Chapter accent colors auto-assigned
- [ ] AI reflection streams with typewriter effect
- [ ] Share options styled as Kindred pill buttons

---

## Data Model Decisions

### Status Enum Resolution

Use the PRD's status enum: `"planning" | "active" | "completed" | "booklet_draft" | "published"`.

This replaces the `feat-trip-status-lifecycle.md` approach. The lifecycle plan's `activatedAt` and `completedAt` timestamp fields are kept for tracking — they complement the status enum rather than replacing it.

### Old vs New Trip Data

- Old trips (pre-redesign) use `tripItems` / `tripDestinations` / `tripItemOptions`
- New trips use `itineraryDays` / `tripStops` / `tripMemories`
- The UI renders both: old trips show existing TripDetails layout restyled with new tokens; new trips use the full wizard + Trip Mode experience
- No migration of old trips required for V1

### Visibility Enum

Unify to `"private" | "pod" | "public"` for both `podTrips.visibility` and `tripBooklets.visibility`. A booklet cannot be more public than its parent trip.

---

## Dependencies & Prerequisites

| Dependency | Status | Notes |
|---|---|---|
| Supabase database (dev + prod) | Done | Schema pushed in previous session |
| Clerk auth | Done | Working |
| Google Places API key | Done | Working |
| OpenAI API key | Done | For AI generation |
| `embla-carousel-react` | Installed | v8.6.0 |
| `vaul` | Installed | v1.1.2 |
| `framer-motion` | Installed | v12.23.24 |
| `@dnd-kit` | Installed | For drag-and-drop in itinerary editor |
| `embla-carousel-autoplay` | **Not installed** | Install if autoplay needed |
| Vercel SSE support | **Needs verification** | Test streaming through serverless |

---

## Risk Analysis

| Risk | Severity | Mitigation |
|---|---|---|
| Color token swap breaks pages with hardcoded values | Medium | Audit all files with `grep` before swapping |
| SSE streaming fails on Vercel serverless (10s timeout) | High | Build polling fallback for AI generation |
| Phase 0 token swap changes everything at once | Medium | Deploy to preview branch first, QA all pages |
| Trip Mode dark theme CSS leaks to other pages | Low | Scope with `.trip-mode` wrapper class |
| Old trips incompatible with new card components | Medium | Render old trips with restyled existing components |
| Google Maps z-index conflicts with Vaul bottom sheet | Low | Test and adjust z-index layering |

---

## Phased Delivery Order

```
Phase 0: Design Token Foundation        (foundation, enables all others)
  ↓
Phase 1: Core Component Library          (building blocks)
  ↓
Phase 2: Navigation Overhaul             (highest visual impact per effort)
  ↓
Phase 3: Pre-Trip Planning Wizard        (flagship feature, uses all new components)
  ↓
Phase 4: Trip Mode                       (architecturally isolated, dark theme)
  ↓
Phase 5: Explore & Card Redesign         (map view, cards, Home feed)
  ↓
Phase 6: Profile, Trust & Onboarding     (trust signals, onboarding wizard)
  ↓
Phase 7: Post-Trip Booklet Polish        (editorial refinement)
```

Phases 4 and 5 can run in parallel since Trip Mode is architecturally isolated.

---

## References

### Internal
- `client/src/index.css` — Current design tokens and CSS utilities
- `client/src/components/layout/BottomNav.tsx` — Current mobile nav
- `client/src/components/layout/Sidebar.tsx` — Current desktop nav
- `client/src/pages/Onboarding.tsx` — Current onboarding (3-step)
- `client/src/pages/Explore.tsx` — Current map view
- `client/src/pages/TripDetails.tsx` — Current trip detail (~1800 lines)
- `plans/feat-rebuild-trip-planner.md` — Previous trip planner plan
- `plans/feat-trip-status-lifecycle.md` — Lifecycle plan (superseded for status enum)

### External
- [Kindred Design System Skill](/Users/seanwilkinson/.claude/skills/kindred-design-system/kindred-design-system/SKILL.md)
- [Tailwind v4 Theme Variables](https://tailwindcss.com/docs/theme)
- [shadcn/ui Components](https://ui.shadcn.com/docs/components)
- [Embla Carousel](https://www.embla-carousel.com/)
- [Vaul Drawer](https://vaul.emilkowal.ski/)
- [Framer Motion](https://motion.dev/docs/react-animation)

### PRD
- `/Users/seanwilkinson/Downloads/famvoy-trip-prd.docx` — Trip Planning Feature PRD (Pre-Trip, Trip Mode, Post-Trip Booklet)
