# feat: On-Trip Experience -- Today Card, Check-ins & Photos

**Priority:** 2 of 4
**Parent plan:** `feat-full-trip-lifecycle.md`
**Depends on:** `feat-trip-status-lifecycle.md`
**Estimated effort:** 1-2 weeks

---

## Overview

Build the core on-trip experience: a "Today" card showing the current day's itinerary, check-ins to mark activities as done, and trip photos linked to specific days and items. This transforms FamVoy from a planning-only tool into a live travel companion.

## Problem Statement

The moment a family starts their trip, FamVoy becomes irrelevant. There's no "I'm on Day 3" experience. Grandparents can't follow along. Photos taken during the trip have no connection to the itinerary. The trip detail page looks exactly the same whether you're planning, traveling, or reminiscing.

## Proposed Solution

### New Tables

**`tripItemCheckins`** -- marks itinerary items as completed during the trip:
```
tripItemCheckins
  id: serial PK
  tripItemId: integer FK -> tripItems.id
  userId: integer FK -> users.id
  completedAt: timestamp (defaultNow)
  photoUrl: text (nullable)
  caption: text (nullable)
  locationLat: numeric (nullable)
  locationLng: numeric (nullable)
```

**`tripPhotos`** -- photos captured during the trip, linked to days and items:
```
tripPhotos
  id: serial PK
  tripId: integer FK -> podTrips.id
  tripItemId: integer (nullable, FK -> tripItems.id)
  dayNumber: integer (nullable)
  userId: integer FK -> users.id
  photoUrl: text
  caption: text (nullable)
  locationLat: numeric (nullable)
  locationLng: numeric (nullable)
  takenAt: timestamp (defaultNow)
  createdAt: timestamp (defaultNow)
```

### Features

#### Today Card

A prominent card at the top of TripDetails when trip status is `active`.

**Contents:**
- Day number ("Day 3") computed as `Math.ceil((now - startDate) / 86400000)`, adjusted for destination timezone
- Current date
- Today's itinerary items in chronological order
- Each item shows: time, title, type icon, check-in button
- Past days' items show completion status
- Tomorrow's items visible below in dimmed section

#### Check-ins

Tap-to-complete flow on itinerary items.

**Flow:**
1. User taps check-in button on a Today card item
2. Optional: add photo (camera or gallery) and caption
3. Item shows green checkmark with timestamp
4. Check-in visible to trip followers (when live sharing is built later)

**Relationship to `experienceCheckins`:** These are separate concepts. Trip item check-ins record itinerary completion. Experience check-ins record community activity participation. Do NOT auto-create experience check-ins from trip check-ins in this phase.

#### Trip Photo Gallery

Day-organized photo grid accessible from the trip detail page.

**Flow:**
1. Camera icon available on Today card, specific items, or as a floating action button
2. Take or select photo, add optional caption
3. Photo linked to trip + optionally to a specific item and day
4. Gallery view organized by day, accessible from trip detail page
5. GPS-tagged photos auto-associate with location

**Photo storage:** Use existing GCS presigned URL flow from `objectStorage.ts`. Same upload pattern already used elsewhere in the app.

## Acceptance Criteria

- [x] `tripItemCheckins` table created in `shared/schema.ts` with insert schema and types
- [x] `tripPhotos` table created in `shared/schema.ts` with insert schema and types
- [x] API endpoints:
  - `POST /api/trips/:tripId/items/:itemId/checkin` -- create check-in (optional photo, caption, location)
  - `DELETE /api/trips/:tripId/items/:itemId/checkin` -- undo check-in
  - `GET /api/trips/:tripId/checkins` -- list all check-ins for a trip
  - `POST /api/trips/:tripId/photos` -- upload trip photo (optional itemId, dayNumber, caption)
  - `GET /api/trips/:tripId/photos` -- list trip photos, filterable by day
  - `DELETE /api/trips/:tripId/photos/:photoId` -- delete a photo
- [x] Today card component renders on TripDetails when status is `active`
- [x] Today card shows correct day number based on trip start date and destination timezone
- [x] Check-in button on each today item; tapping opens optional photo/caption sheet
- [x] Checked-in items show green checkmark and timestamp
- [x] Trip photo gallery page/section accessible from trip detail
- [x] Photos organized by day in the gallery
- [x] Photo upload uses existing GCS presigned URL pattern
- [x] TripDetails page shows different layout for `active` trips (Today card prominent, planning UI secondary)

## Technical Approach

### Today Card Component

```
client/src/components/trip/TodayCard.tsx
```

Query trip items for the current day using the trip's start date and destination timezone. Group items by time slot. Show check-in state from `tripItemCheckins`.

### Day Number Computation

```typescript
function getDayNumber(tripStartDate: string, timezone?: string): number {
  const now = timezone ? new Date(new Date().toLocaleString('en-US', { timeZone: timezone })) : new Date();
  const start = new Date(tripStartDate);
  return Math.ceil((now.getTime() - start.getTime()) / 86_400_000);
}
```

### Check-in API

In `server/routes.ts`, add check-in routes under the existing trip routes section. Each check-in is scoped to a trip item and user. Only one check-in per user per item (upsert behavior or unique constraint).

### Photo Upload

Reuse the `objectStorage.ts` presigned URL flow:
1. Client requests presigned upload URL via `POST /api/trips/:tripId/photos/upload-url`
2. Client uploads directly to GCS
3. Client confirms upload with `POST /api/trips/:tripId/photos` passing the resulting URL

## Files to Create

- `client/src/components/trip/TodayCard.tsx` -- Today card component
- `client/src/components/trip/CheckinButton.tsx` -- Check-in interaction component
- `client/src/components/trip/TripPhotoGallery.tsx` -- Day-organized photo grid
- `client/src/pages/TripPhotos.tsx` -- Full photo gallery page (optional, could be a section in TripDetails)

## Files to Modify

- `shared/schema.ts` -- Add `tripItemCheckins` and `tripPhotos` tables
- `server/routes.ts` -- Add check-in and photo API endpoints
- `client/src/pages/TripDetails.tsx` -- Integrate Today card for active trips
- `client/src/lib/api.ts` -- Add check-in and photo API methods

## Dependencies

- `feat-trip-status-lifecycle.md` must be complete (needs `active` status, timezone field)
- GCS object storage (already integrated)

## Blocks

This plan blocks:
- `feat-trip-memories.md` (Trip Book renders check-ins and photos)

## References

### Internal
- `shared/schema.ts` -- tripItems table definition
- `server/routes.ts` -- existing trip routes (~lines 1850-2600)
- `server/objectStorage.ts` -- GCS upload pattern
- `client/src/pages/TripDetails.tsx` -- where Today card will be integrated

### External
- [Polarsteps](https://polarsteps.com) -- reference for trip tracking UX
