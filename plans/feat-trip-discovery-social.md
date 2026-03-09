# feat: Trip Discovery & Social Feed -- Dreams, Copy Trip, Feed & Sharing

**Priority:** 4 of 4
**Parent plan:** `feat-full-trip-lifecycle.md`
**Depends on:** `feat-trip-status-lifecycle.md`, `feat-on-trip-experience.md` (partially), `feat-trip-memories.md` (partially)
**Estimated effort:** 2 weeks

---

## Overview

Build the discovery and social layers: a Dream Board for trip inspiration, AI destination suggestions, the ability to copy friends' trips, and trip-related sections on the home feed (Traveling Now, Recent Adventures). These features create engagement loops before and between trips.

## Problem Statement

**Pre-trip gap:** Users open FamVoy only when they already know where they're going. There's no reason to open the app on a random Tuesday when daydreaming about summer vacation.

**Social gap:** The home feed has zero trip content. Trips are invisible to anyone outside the creator and pod. There's no social discovery through travel -- no "the Smiths just went to Costa Rica and loved it" moments.

**Retention context:** Travel apps face 2.8% 30-day retention. The only way to beat this is giving users reasons to open the app between trips. Dream boards, friend activity, and social feeds create those engagement loops.

## Proposed Solution

### New Tables

**`dreamBoardItems`** -- saved destination inspiration:
```
dreamBoardItems
  id: serial PK
  userId: integer FK -> users.id
  destinationName: text
  destinationPlaceId: text (nullable, Google Places ID)
  coverImageUrl: text (nullable)
  notes: text (nullable)
  tags: text[] (e.g., ["beach", "kid-friendly", "budget"])
  sourceTripId: integer (nullable, FK -> podTrips.id)
  createdAt: timestamp (defaultNow)
```

**`tripFollowers`** -- users following a trip for live updates:
```
tripFollowers
  id: serial PK
  tripId: integer FK -> podTrips.id
  userId: integer FK -> users.id
  createdAt: timestamp (defaultNow)

  UNIQUE(tripId, userId)
```

**`tripReactions`** -- emoji reactions on completed trips:
```
tripReactions
  id: serial PK
  tripId: integer FK -> podTrips.id
  userId: integer FK -> users.id
  reactionType: text ("love" | "wow" | "clap" | "fire" | "laugh" | "heart_eyes")
  createdAt: timestamp (defaultNow)

  UNIQUE(tripId, userId, reactionType)
```

**`tripComments`** -- comments on completed trips:
```
tripComments
  id: serial PK
  tripId: integer FK -> podTrips.id
  userId: integer FK -> users.id
  content: text
  createdAt: timestamp (defaultNow)
```

### Features

#### Dream Board

A personal collection for saving destination ideas -- like Pinterest for travel.

**Flow:**
1. New "Dreams" tab (alongside Trips in bottom nav, or as a sub-tab)
2. Grid of saved destination cards (image, name, notes, tags)
3. "+" to add: destination name (Google Places autocomplete), notes, interest tags
4. Can also save from completed trips, experiences, AI suggestions
5. "Plan This Trip" on a dream item -> creates new trip pre-filled with destination

#### AI Destination Suggestions

Personalized "where should we go?" recommendations.

**Flow:**
1. "Suggest Destinations" card on Dreams tab
2. Optional inputs: when (month/season), budget range, trip style (beach/city/adventure/nature)
3. AI generates 3-5 suggestions with: why it's great for your family, best time, estimated budget, sample activities
4. Save to dream board or start planning immediately

**Implementation:** Uses same OpenAI integration as itinerary generation. Prompt includes family member ages (from `familyMembers`), interests (from `users.interests`), past destinations (to avoid repeats).

#### Browse Friends' Completed Trips

**Flow:**
1. Discovery section on Dreams tab showing completed trips from pod members and followed users
2. Cards: destination photo, family name, dates, AI summary, highlight reel
3. Tap opens read-only trip view
4. "Copy This Trip" button available

#### Copy This Trip

Clone another family's itinerary as a starting point.

**Endpoint:** `POST /api/trips/:id/copy`

**Server logic:**
- Clone `podTrips` record (new id, new owner, `status: "draft"`, null dates, null podId)
- Clone `tripDestinations` with relative day offsets preserved
- Clone `tripItems` (reset `selectedOptionId`, `confirmationState` to `pending`)
- Do NOT clone `tripItemOptions`, `tripConfirmationSessions`, or concierge data

#### Home Feed: Traveling Now

Horizontal scroll section at the top of Home showing active trips from the user's network.

**Query:**
```sql
SELECT * FROM pod_trips
WHERE status = 'active'
  AND visibility IN ('pod', 'public')
  AND created_by_user_id IN (followed_user_ids, pod_member_ids)
```

**Card:** Family avatar, "The Smiths are in Barcelona", cover photo, day number.

#### Home Feed: Recent Adventures

Cards for recently completed trips from the user's network.

**Card:** Cover photo, destination, dates, stat summary, star rating, top highlight, "Copy This Trip" button.

#### Trip Reactions & Comments

Social engagement on completed trips visible in the feed and on trip detail pages.

#### Live Trip Sharing

**Flow:**
1. Trip owner enables "Live Sharing" toggle in trip settings
2. Followers see card in feed: "The Wilkinsons are in Barcelona!"
3. Live trip view: map with route, current city, completed check-ins
4. New check-ins/photos appear via existing WebSocket infrastructure
5. Followers can react with emoji (no comments on live view)

**Privacy model:**

| Visibility | Who Can See | What's Exposed |
|-----------|-------------|----------------|
| `private` | Creator only | Everything |
| `pod` | Pod members | Itinerary + check-ins + photos. Current city, not addresses. |
| `public` | Any follower | Current city + check-ins only. No hotels, flights, or future plans. |

Default: `pod`. Public never exposes addresses or future schedule.

## Acceptance Criteria

- [x] `dreamBoardItems`, `tripFollowers`, `tripReactions`, `tripComments` tables in `shared/schema.ts`
- [x] API endpoints:
  - `GET /api/dreams` -- list user's dream board items
  - `POST /api/dreams` -- add dream board item
  - `PUT /api/dreams/:id` -- update dream board item
  - `DELETE /api/dreams/:id` -- remove dream board item
  - `POST /api/dreams/suggest` -- AI destination suggestions
  - `POST /api/trips/:id/copy` -- copy a trip
  - `GET /api/feed/traveling-now` -- active trips from network
  - `GET /api/feed/recent-adventures` -- recently completed trips from network
  - `POST /api/trips/:tripId/follow` -- follow a trip
  - `DELETE /api/trips/:tripId/follow` -- unfollow
  - `POST /api/trips/:tripId/reactions` -- add reaction
  - `DELETE /api/trips/:tripId/reactions/:type` -- remove reaction
  - `GET /api/trips/:tripId/comments` -- list comments
  - `POST /api/trips/:tripId/comments` -- add comment
  - `DELETE /api/trips/:tripId/comments/:id` -- delete comment
- [x] Dreams tab accessible from main navigation
- [x] Dream board displays grid of saved destinations
- [x] AI suggestions generate 3-5 personalized recommendations
- [x] "Plan This Trip" creates a new draft trip from a dream item
- [x] "Copy This Trip" clones trip structure without booking data
- [x] Home feed shows "Traveling Now" section with active trips from network
- [x] Home feed shows "Recent Adventures" section with completed trips
- [x] Reactions (emoji) work on completed trips
- [x] Comments work on completed trips
- [ ] Live sharing toggle in trip settings (deferred -- needs WebSocket live view)
- [ ] Live trip view respects visibility tier (deferred -- needs WebSocket live view)

## Files to Create

- `client/src/pages/Dreams.tsx` -- Dream board page
- `client/src/components/dreams/DreamCard.tsx` -- Dream item card
- `client/src/components/dreams/AddDreamSheet.tsx` -- Add/edit dream bottom sheet
- `client/src/components/dreams/AISuggestions.tsx` -- AI suggestion cards
- `client/src/components/feed/TravelingNowSection.tsx` -- Active trips feed section
- `client/src/components/feed/RecentAdventuresSection.tsx` -- Completed trips feed section
- `client/src/components/trip/TripReactions.tsx` -- Emoji reaction bar
- `client/src/components/trip/TripComments.tsx` -- Comments section
- `client/src/components/trip/LiveTripView.tsx` -- Live sharing viewer

## Files to Modify

- `shared/schema.ts` -- Add 4 new tables
- `server/routes.ts` -- Add all new endpoints
- `client/src/lib/api.ts` -- Add new API methods
- `client/src/pages/Home.tsx` -- Add Traveling Now and Recent Adventures sections
- `client/src/pages/TripDetails.tsx` -- Add reactions, comments, follow, live sharing toggle
- `client/src/components/layout/BottomNav.tsx` -- Add Dreams tab (or modify Trips tab)
- `client/src/App.tsx` -- Add Dreams route

## Dependencies

- `feat-trip-status-lifecycle.md` (needs `active`, `completed` statuses, `visibility` field)
- `feat-on-trip-experience.md` (live sharing shows check-ins and photos)
- `feat-trip-memories.md` (Recent Adventures cards show ratings and highlights)
- OpenAI API (already integrated -- for AI suggestions)
- Google Places API (already integrated -- for dream board autocomplete)
- WebSocket infrastructure (already exists -- for live sharing updates)

## References

### Internal
- `shared/schema.ts` -- podTrips, tripDestinations, tripItems tables
- `server/routes.ts` -- existing trip and feed routes
- `client/src/pages/Home.tsx` -- home feed (no trip content currently)
- `client/src/pages/Explore.tsx:142` -- unused `showTripsDrawer` state (potential reuse)

### External
- [Boop](https://boopwithme.com) -- friend-sourced itineraries, copy-a-trip reference
- [Polarsteps](https://polarsteps.com) -- live trip sharing reference
- [Wanderlog](https://wanderlog.com) -- collaborative planning reference
