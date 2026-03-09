# Desktop Layout Overhaul — Lean Plan

## The Problem
The app looks like a phone floating in a gray void on desktop. 13 of 26 pages have zero responsive breakpoints. The Explore page overlaps the sidebar. Fixed grids don't adapt.

## PR 1: Desktop Width & Responsive Grids (Low Risk)

All changes are CSS-only, behind `md:`/`lg:`/`xl:` prefixes. Mobile untouched.

### 1. Remove global max-w-md from App.tsx

**File:** `client/src/App.tsx:116`

```
// From:
max-w-md md:max-w-none
// To: remove max-w-md entirely, keep md:max-w-none or just remove both
```

### 2. Add per-page max-width constraints

Add `max-w-{size} mx-auto px-4 md:px-8` to each page's root div:

| Page | max-width |
|------|-----------|
| Home | max-w-6xl |
| Trips | max-w-6xl |
| Dreams | max-w-6xl |
| Pods | max-w-6xl |
| AgentDashboard | max-w-6xl |
| TripDetails | max-w-6xl |
| Profile | max-w-5xl |
| PodDetails | max-w-5xl |
| ExperienceDetails | max-w-5xl |
| TripBook | max-w-5xl |
| AgentRequestDetails | max-w-5xl |
| FamilyProfile | max-w-5xl |
| Chat | max-w-5xl |
| Cart | max-w-4xl |
| ConversationDetail | max-w-4xl |
| TripConfirmWizard | max-w-4xl |
| ConciergeBookingWizard | max-w-4xl |
| Create | max-w-3xl |
| Settings | max-w-3xl |
| CheckoutSuccess | max-w-2xl |
| CheckoutCancel | max-w-2xl |
| ConciergeSuccess | max-w-2xl |
| Onboarding | max-w-2xl |
| NotFound | max-w-2xl |
| Landing | already handled |
| Explore | full-bleed (no max-w) |

### 3. Fix Explore sidebar overlap

**File:** `client/src/pages/Explore.tsx:391`

```
// From: fixed inset-0
// To: fixed inset-0 md:left-64
```

Also fix search bar, filter chips, and bottom sheet positioning.

### 4. Make fixed grids responsive

| File | From | To |
|------|------|----|
| `Dreams.tsx:98` | `grid-cols-2` | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` |
| `TripDetails.tsx:1131` | `grid-cols-4` | `grid-cols-2 md:grid-cols-3 lg:grid-cols-4` |
| `TripDetails.tsx:1297,1497` | `grid-cols-3` | `grid-cols-2 md:grid-cols-3` |
| `FamilyProfile.tsx:235,339` | `grid-cols-3` | `grid-cols-2 md:grid-cols-3` |
| `TripBook.tsx:125,186` | `grid-cols-3` | `grid-cols-2 md:grid-cols-3` |
| `PodDetails.tsx:528,621` | `grid-cols-2/3` | `grid-cols-2 md:grid-cols-3` |
| `AgentDashboard.tsx:252` | `grid-cols-5` | `grid-cols-2 md:grid-cols-3 lg:grid-cols-5` |
| `AgentRequestDetails.tsx:206` | `grid-cols-2` | `grid-cols-1 md:grid-cols-2` |

### 5. CSS hover states on cards

Add to all interactive card components:
```
hover:shadow-lg hover:-translate-y-0.5 transition-[transform,box-shadow] duration-200
```

Image zoom on image cards:
```
group + overflow-hidden on container
group-hover:scale-105 transition-transform duration-500 ease-out on img
```

**Also:** Remove React `useState` hover state from `ExperienceCard.tsx:18-19` — replace with CSS `:hover`.

### 6. Performance quick wins

- Wrap `ExploreMap` in `React.memo` (`client/src/components/shared/ExploreMap.tsx`)
- Memoize `formattedExperiences` in `Explore.tsx:360` with `useMemo`
- Replace `transition-all` with specific properties wherever found

---

## PR 2: Split-View Layouts (Structural Changes)

These change component hierarchy and are more complex.

### 1. Explore — Card Grid + Sticky Map Split View

On `lg+`: Replace fixed overlay with side-by-side layout.

```
Left panel (60%): scrollable card grid, auto-fit minmax(280px, 1fr)
Right panel (40%): sticky map, h-dvh, sticky top-0
Mobile: keep current bottom-sheet + full-screen map behavior
```

### 2. Chat — Conversation List + Active Chat

On `lg+`: Show both panels side-by-side.

```
Left panel (w-80): conversation list, border-r, overflow-y-auto
Right panel (flex-1): active conversation, messages max-w-2xl centered
Mobile: keep current separate routes
```

### 3. Detail Pages — Main + Sticky Action Sidebar

On `lg+` for TripDetails, PodDetails, ExperienceDetails:

```
grid lg:grid-cols-[1fr_320px] lg:gap-8
Main content: itinerary, photos, activities
Sticky sidebar: trip actions, member list, booking summary
  sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto
```

### 4. Cart — Items + Summary Side-by-Side

On `lg+`:
```
grid lg:grid-cols-[1fr_350px] lg:gap-8
Left: cart items
Right: order summary (sticky)
```

---

## Future Work (Not This Plan)

- Three-column feed layout with widget sidebar (when widget content exists)
- Collapsible sidebar (icon-only mode)
- Search/notifications in sidebar
- Breadcrumbs on detail pages
- Keyboard shortcuts
- Typography/font-weight refinements
- Container queries for card components
- Dialog/Drawer responsive swap
- Staggered mount animations
