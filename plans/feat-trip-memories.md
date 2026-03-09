# feat: Trip Memories -- Trip Book, Stats, Highlights & Travel Profile

**Priority:** 3 of 4
**Parent plan:** `feat-full-trip-lifecycle.md`
**Depends on:** `feat-trip-status-lifecycle.md`, `feat-on-trip-experience.md`
**Estimated effort:** 1-2 weeks

---

## Overview

Build the post-trip experience that creates emotional value and drives long-term retention: an auto-assembled Trip Book, trip statistics, highlight curation, a travel map on profiles, and anniversary memory cards. This is what makes families come back to FamVoy between trips.

## Problem Statement

After a trip ends, the app goes silent. Past trips are dimmed cards on a list. There's no reason to revisit them. Photos live in a camera roll, disconnected from trip context. The Profile page shows "No trip stats yet" (line 630). A family's travel history -- potentially years of adventures -- is invisible.

Apps with the highest retention (Polarsteps, Google Photos) succeed by creating emotional value through memories. Users return not because they need to plan -- they return because they want to relive.

## Proposed Solution

### New Table

**`tripHighlights`** -- user-curated "best of" moments:
```
tripHighlights
  id: serial PK
  tripId: integer FK -> podTrips.id
  tripItemId: integer (nullable, FK -> tripItems.id)
  userId: integer FK -> users.id
  highlightType: text ("favorite_moment" | "best_food" | "best_view" | "kids_favorite")
  notes: text (nullable)
  createdAt: timestamp (defaultNow)
```

The `overallRating` (1-5) field on `podTrips` is added in `feat-trip-status-lifecycle.md`.

### Features

#### Trip Book

An auto-assembled, day-by-day story of the trip combining itinerary, photos, check-ins, and a route map.

**Page:** `/trip/:id/book` -- accessible from trip detail when status is `completed`

**Content (assembled on-the-fly, not generated):**
1. Route map header: destination pins connected by polylines (using geocoded coordinates from `tripDestinations`)
2. Trip stats banner: X days, Y places visited, Z photos
3. Day-by-day sections:
   - Day number, date, destination name
   - Photos for that day (carousel)
   - Completed items with times and captions from check-ins
4. Highlights section (if any curated)
5. Overall rating display

**If no check-ins or photos exist:** Show a lighter version with just the itinerary and a prompt to add photos retroactively.

**Animations:** Use Framer Motion for scroll-linked day transitions.

#### Trip Statistics

Computed on read from existing data:

- **Days traveled:** `endDate - startDate`
- **Destinations visited:** count of `tripDestinations`
- **Activities completed:** count of `tripItemCheckins`
- **Photos captured:** count of `tripPhotos`
- **Distance traveled:** sum of straight-line distances between consecutive geocoded destinations

No separate stats table needed initially. These are simple aggregations. Add a `travelStats` cache later if performance requires it.

#### Highlights & Ratings

**Flow:**
1. After trip completion (or anytime in Trip Book), user can mark items as highlights
2. Star rating (1-5) for the overall trip (stored on `podTrips.overallRating`)
3. Pick "Top 3 Moments" from checked-in items
4. Highlights appear in Trip Book, profile, and feed cards

#### Family Travel Profile

A world map + stats on the user's profile page.

**Components:**
- World map with pins for every completed trip destination (using existing `GoogleMapsProvider` + `@googlemaps/markerclusterer`)
- Aggregate stats below the map:
  - Total trips completed
  - Countries visited (derived from destination geocoding)
  - Total travel days
  - Favorite trip (highest-rated)

This replaces the "No trip stats yet" placeholder at `Profile.tsx:630`.

#### Anniversary Memory Cards

"1 year ago, your family was in Yellowstone."

**Implementation:** On each home feed load, query `podTrips` where `startDate` day/month matches today and status is `completed`. Show a memory card with trip cover photo, destination, and "Relive This Trip" link to the Trip Book.

One card per trip, shown on the start date anniversary only. No cron job needed.

## Acceptance Criteria

- [x] `tripHighlights` table created in `shared/schema.ts`
- [x] API endpoints:
  - `GET /api/trips/:tripId/book` -- aggregated trip book data (items, check-ins, photos, highlights by day)
  - `POST /api/trips/:tripId/highlights` -- add a highlight
  - `DELETE /api/trips/:tripId/highlights/:id` -- remove a highlight
  - `PUT /api/trips/:tripId/rating` -- set overall rating
  - `GET /api/users/:userId/travel-stats` -- aggregate travel statistics
  - ~~`GET /api/users/:userId/travel-map`~~ -- deferred (tripDestinations lack lat/lng)
  - `GET /api/feed/memories` -- anniversary trip cards for current user
- [x] Trip Book page at `/trip/:id/book` renders day-by-day view
- [ ] Trip Book shows route map with destination pins and polylines (deferred -- needs geocoded destinations)
- [x] Trip Book shows stats banner
- [x] Trip Book degrades gracefully with no photos/check-ins
- [x] Highlights UI allows marking items and selecting highlight type
- [x] Star rating UI on completed trips
- [ ] Travel Map component on Profile page with clustered pins (deferred -- needs geocoded destinations)
- [x] Profile stats section replaces "No trip stats yet" placeholder
- [x] Anniversary memory cards appear on home feed on trip start date anniversaries
- [x] Tapping memory card opens Trip Book

## Technical Approach

### Trip Book Page

```
client/src/pages/TripBook.tsx
```

Single API call to `/api/trips/:tripId/book` returns all data needed: trip details, destinations (with coordinates), items grouped by day, check-ins, photos, highlights. The client renders this into the magazine-style layout.

### Travel Stats Computation

```typescript
// server/lib/travelStats.ts
async function getUserTravelStats(userId: number) {
  const completedTrips = await db.select().from(podTrips)
    .where(and(eq(podTrips.createdByUserId, userId), eq(podTrips.status, 'completed')));

  const destinations = await db.select().from(tripDestinations)
    .where(inArray(tripDestinations.tripId, completedTrips.map(t => t.id)));

  // Compute: total trips, total days, unique countries, distance, favorite trip
}
```

### Distance Calculation

Haversine formula between consecutive geocoded destinations:

```typescript
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  // Returns distance in km
}
```

Sum distances across all destinations in chronological order per trip, then sum across all trips for the profile total.

### Anniversary Query

```sql
SELECT * FROM pod_trips
WHERE created_by_user_id = $userId
  AND status = 'completed'
  AND EXTRACT(MONTH FROM start_date) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND EXTRACT(DAY FROM start_date) = EXTRACT(DAY FROM CURRENT_DATE)
```

## Files to Create

- `client/src/pages/TripBook.tsx` -- Trip Book page
- `client/src/components/trip/TripStatsBar.tsx` -- Stats banner component
- `client/src/components/trip/HighlightPicker.tsx` -- Highlight curation UI
- `client/src/components/trip/StarRating.tsx` -- Rating input component
- `client/src/components/profile/TravelMap.tsx` -- World map with trip pins
- `client/src/components/profile/TravelStats.tsx` -- Profile stats section
- `client/src/components/feed/AnniversaryCard.tsx` -- Memory card for home feed

## Files to Modify

- `shared/schema.ts` -- Add `tripHighlights` table
- `server/routes.ts` -- Add trip book, highlights, rating, stats, and memory endpoints
- `client/src/lib/api.ts` -- Add new API methods
- `client/src/pages/TripDetails.tsx` -- Add "View Trip Book" link for completed trips
- `client/src/pages/Profile.tsx` -- Replace stats placeholder (~line 630) with TravelMap + TravelStats
- `client/src/pages/Home.tsx` -- Add anniversary memory cards section
- `client/src/App.tsx` -- Add `/trip/:id/book` route

## Dependencies

- `feat-trip-status-lifecycle.md` (needs `completed` status, `overallRating`, geocoded destinations)
- `feat-on-trip-experience.md` (Trip Book renders check-ins and photos)

## V2 (Deferred)

These are significant features, not polish. Build separately:

- **Year-in-Travel Summary** -- "Spotify Wrapped" for family travel. AI-generated narrative from stats. Shareable image generation. Promoted in December/January.
- **Shareable Trip Cards** -- Branded summary card images for external social media. Requires server-side image generation (canvas or Satori/og-image).

## References

### Internal
- `client/src/pages/Profile.tsx:630` -- "No trip stats yet" placeholder
- `client/src/pages/Home.tsx` -- home feed where anniversary cards will appear
- `client/src/components/maps/` -- existing Google Maps components

### External
- [Polarsteps](https://polarsteps.com) -- trip books and year-in-review reference
- [TripMemo](https://tripmemo.app) -- day-by-day memory book reference
