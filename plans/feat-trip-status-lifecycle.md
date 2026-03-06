# feat: Trip Status Lifecycle & Foundation

**Priority:** 1 of 4 (build first -- everything else depends on this)
**Parent plan:** `feat-full-trip-lifecycle.md`
**Estimated effort:** 1-2 weeks

## Enhancement Summary

**Deepened on:** 2026-03-05
**Research agents used:** TypeScript reviewer, Architecture strategist, Performance oracle, Data integrity guardian, Security sentinel, Code simplicity reviewer, Pattern recognition specialist, Best practices researcher, Context7 (Drizzle ORM docs)

### Key Improvements from Research
1. **Separate lifecycle phase from planning status** -- `active`/`completed` are orthogonal to the planning workflow. Use a new `lifecyclePhase` field instead of extending `status`.
2. **Fix critical date parsing bug** -- `new Date("YYYY-MM-DD")` parses as UTC midnight, causing off-by-one errors. Must use timezone-aware local-date comparison.
3. **Use `real` not `numeric` for coordinates** -- matches existing `users.locationLat`/`experiences.locationLat` pattern. `numeric` returns strings in Drizzle.
4. **Add authorization to trip endpoints (BLOCKING)** -- `GET /api/trips/:id` has no auth. Any visitor can read any trip by ID. Must fix before adding GPS/visibility data.
5. **Scope reduction: defer 6 of 8 columns** -- only `activatedAt` and `completedAt` are needed for Sprint 2. Visibility, cover image, timezone, rating, geocoding can each be added as a single `ALTER TABLE` in the sprint that uses them.

### New Considerations Discovered
- The existing `status` field has no type constraint -- any string is accepted. Add a TypeScript union type.
- `DEFAULT 'pod'` on `visibility` will NOT backfill existing rows -- they stay NULL.
- Multiple reviewers recommend pure compute-on-read (no write-back) to avoid race conditions and side effects on GET requests.
- Security audit found CRITICAL: `GET /api/trips/:id`, `PATCH /api/trips/:id`, and `DELETE /api/trips/:id` have no ownership checks. Any authenticated user can modify or delete any trip.

---

## Overview

Extend the trip data model to support the full lifecycle: tracking when trips are actively being traveled and when they're completed. This is the minimal foundation that the on-trip experience, memories, and social features all depend on.

## Problem Statement

The current `podTrips.status` field only covers the planning phase:

```
draft -> confirming -> confirmed -> booking_in_progress -> booked
```

There's no concept of a trip being "in progress" or "finished." The moment travel starts, the app has no awareness of it. This blocks every downstream feature: Today cards, check-ins, Trip Books, feed content, and anniversary memories all require knowing whether a trip is active or completed.

### Research Insight: Status vs. Lifecycle Phase

All 8 status fields in the codebase are `text()` with no enum, no CHECK constraint, and no Zod validation. The `updateTripStatus` method in `storage.ts:1707` accepts `status: string` -- any string. Every existing transition is action-driven (user clicks, payment succeeds, agent marks complete).

`active` and `completed` are fundamentally different -- they are **time-derived**, not action-derived. A trip can be "booked" AND "active" at the same time. Extending the `status` field overwrites the planning workflow state and loses information (you can no longer tell if an active trip was booked through the concierge or was a casual draft).

---

## Proposed Solution

### Approach: Separate `lifecyclePhase` Field

Instead of extending the existing `status` field, add a new orthogonal field:

```
status (planning workflow):     draft -> confirming -> confirmed -> booking_in_progress -> booked
lifecyclePhase (temporal):      planning -> traveling -> completed
```

Both fields remain independently queryable. The client can combine them:

```typescript
if (trip.lifecyclePhase === 'traveling') {
  // Show Today card, check-in buttons
} else if (trip.lifecyclePhase === 'completed') {
  // Show Trip Book link, rating
} else {
  // Show planning UI based on trip.status (draft/confirming/confirmed/etc.)
}
```

### Status Computation: Pure Compute-on-Read (No Write-Back)

**Decision:** Compute `lifecyclePhase` from `activatedAt` and `completedAt` timestamps. Never write back status as a side effect of a GET request.

**Why not hybrid (compute + persist on read):**
- Introduces writes on every GET -- violates least surprise, breaks caching, creates race conditions
- No precedent in the codebase -- every other status is set by explicit user/system actions
- At current scale (dozens to hundreds of trips per user), computation cost is ~0.05ms -- negligible
- Feed queries can filter by date ranges directly: `WHERE start_date <= NOW() AND end_date >= NOW()`

**The `activatedAt`/`completedAt` timestamps ARE the persisted state.** The lifecycle phase is derived:

```typescript
function getLifecyclePhase(trip: { activatedAt: Date | null; completedAt: Date | null }): 'planning' | 'traveling' | 'completed' {
  if (trip.completedAt) return 'completed';
  if (trip.activatedAt) return 'traveling';
  return 'planning';
}
```

**When timestamps get set:** On authenticated trip fetch, if dates indicate a transition, persist the timestamp (with optimistic locking). This is a targeted write on a specific trip the user owns -- not a blanket write-back on every read.

### Schema Changes (Minimal -- Sprint 2 Needs Only)

**`podTrips` -- add 2 columns:**

```typescript
// In shared/schema.ts, add to podTrips table definition:
activatedAt: timestamp("activated_at"),    // when trip first became active
completedAt: timestamp("completed_at"),    // when trip transitioned to completed
```

**Deferred columns** (add in the sprint that needs them):

| Column | Deferred To | Rationale |
|--------|-------------|-----------|
| `visibility` | Sprint 5 (Social & Feed) | No sharing features until then |
| `coverImageUrl` | Sprint 3 or 4 | Cosmetic, not functional for Today Card |
| `timezone` | Sprint 2 (if needed) | Can derive from browser clock; add if implementation proves it's needed |
| `overallRating` | Sprint 3 (Memories) | Explicitly Phase 3 |
| `destinationLat/Lng` | Sprint 3 (Travel Map) | Geocoding infra is a meaningful chunk of work |

Each deferred column is a single `ALTER TABLE ADD COLUMN` when the time comes. Zero migration pain.

### Research Insight: Column Type for Future Coordinates

When `destinationLat`/`destinationLng` are added (Sprint 3), use `real` not `numeric`:

```typescript
// CORRECT -- matches users.locationLat (line 27) and experiences.locationLat (line 68)
destinationLat: real("destination_lat"),
destinationLng: real("destination_lng"),

// WRONG -- numeric returns strings in Drizzle, requires parseFloat() everywhere
// destinationLat: numeric("destination_lat"),  // DON'T DO THIS
```

---

## BLOCKING: Security Prerequisites

The security audit found **critical vulnerabilities** that must be fixed before adding any new data (GPS coordinates, visibility, photos) to trip endpoints.

### Finding 1: No Authorization on Trip CRUD (CRITICAL)

`GET /api/trips/:id` has **no `requireAuth()` middleware and no ownership check**. Any unauthenticated visitor can read any trip by sequential ID. `PATCH` and `DELETE` check auth but not ownership.

**Fix (required before this plan ships):**

```typescript
// server/lib/tripAuth.ts
export async function assertTripAccess(
  userId: number,
  tripId: number,
  requiredLevel: 'read' | 'write' | 'owner'
): Promise<PodTrip> {
  const trip = await storage.getTripById(tripId);
  if (!trip) throw new NotFoundError('Trip not found');

  if (trip.createdByUserId === userId) return trip;

  if (trip.podId) {
    const isMember = await storage.isPodMember(trip.podId, userId);
    if (isMember && requiredLevel !== 'owner') return trip;
  }

  throw new ForbiddenError('Not authorized to access this trip');
}
```

Apply to: `GET /api/trips/:id`, `PATCH /api/trips/:id`, `DELETE /api/trips/:id`, `GET /api/trips/:id/destinations`, `GET /api/pods/:id/trips`.

### Finding 2: Mass Assignment on PATCH (HIGH)

`PATCH /api/trips/:id` passes `req.body` directly to `storage.updateTrip()`. Any field can be set, including `createdByUserId` (ownership takeover) and `status` (bypass lifecycle rules).

**Fix:** Whitelist allowed fields with Zod:

```typescript
const allowedTripUpdate = z.object({
  name: z.string().optional(),
  destination: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  // Add more as needed, but never createdByUserId, status, etc.
});

app.patch("/api/trips/:id", requireAuth(), async (req, res) => {
  const trip = await assertTripAccess(user.id, tripId, 'owner');
  const parsed = allowedTripUpdate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });
  const updated = await storage.updateTrip(tripId, parsed.data);
  res.json(updated);
});
```

---

## Technical Approach

### Type Safety: TripStatus and TripLifecyclePhase

Add to `shared/schema.ts`:

```typescript
// Planning workflow statuses (existing, now typed)
export const TRIP_STATUSES = [
  'draft', 'confirming', 'confirmed', 'booking_in_progress', 'booked',
] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number];

// Lifecycle phases (new, orthogonal to status)
export const TRIP_LIFECYCLE_PHASES = ['planning', 'traveling', 'completed'] as const;
export type TripLifecyclePhase = (typeof TRIP_LIFECYCLE_PHASES)[number];
```

Use Drizzle's `text({ enum: [...] })` for TypeScript inference without a PostgreSQL enum (consistent with all 8 existing status fields in the codebase):

```typescript
status: text("status", { enum: TRIP_STATUSES }).default("draft").notNull(),
```

### Research Insight: text + CHECK > pgEnum

Industry consensus (Crunchy Data, Close.com engineering): use `text` + CHECK constraint, not pgEnum. pgEnum `ALTER TYPE ADD VALUE` cannot run inside a transaction and takes an `ACCESS EXCLUSIVE` lock. CHECK constraints can be swapped with minimal locking. Since the codebase has zero pgEnums across 40+ tables, don't introduce one now.

### Status Transition Validation

Add to `server/lib/tripStatus.ts`:

```typescript
const VALID_STATUS_TRANSITIONS: Record<TripStatus, readonly TripStatus[]> = {
  draft: ['confirming'],
  confirming: ['confirmed', 'draft'],
  confirmed: ['booking_in_progress'],
  booking_in_progress: ['booked'],
  booked: [],  // terminal for planning workflow
} as const;

export function validateStatusTransition(from: TripStatus, to: TripStatus): boolean {
  return VALID_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
```

Call in `updateTripStatus` before persisting. This protects against bugs like a trip jumping from `draft` to `booked` via a bad API call.

### Lifecycle Phase Computation

```typescript
// server/lib/tripStatus.ts

export function computeLifecyclePhase(trip: {
  startDate: string;
  endDate: string;
  activatedAt: Date | null;
  completedAt: Date | null;
}): TripLifecyclePhase {
  if (trip.completedAt) return 'completed';
  if (trip.activatedAt) return 'traveling';

  // Check if dates indicate the trip should be active/completed
  // Parse as LOCAL time (not UTC) by appending T00:00:00
  const now = new Date();
  const start = new Date(trip.startDate + 'T00:00:00');
  const endOfDay = new Date(trip.endDate + 'T23:59:59');

  if (now > endOfDay) return 'completed';
  if (now >= start && now <= endOfDay) return 'traveling';
  return 'planning';
}
```

### Research Insight: Date Parsing Bug

`new Date("2026-07-15")` parses as **midnight UTC**, but `new Date()` returns **local time**. A user in US Eastern at 9pm on July 14 would see the trip activate a day early (because 9pm ET = 1am UTC July 15 > midnight UTC July 15).

**Fix:** Append `T00:00:00` (no `Z`) to force local-time parsing. Use `T23:59:59` for end dates so the trip stays active through the full last day.

### Persisting Lifecycle Transitions

Only persist from authenticated, authorized contexts -- never as a side effect of GET:

```typescript
// server/lib/tripStatus.ts
export async function syncLifecycleIfNeeded(
  trip: PodTrip,
  storage: Storage
): Promise<PodTrip> {
  const phase = computeLifecyclePhase(trip);

  if (phase === 'traveling' && !trip.activatedAt) {
    const [updated] = await db.update(podTrips)
      .set({ activatedAt: new Date() })
      .where(and(
        eq(podTrips.id, trip.id),
        isNull(podTrips.activatedAt)  // Optimistic lock: prevent double-write
      ))
      .returning();
    return updated ?? trip;
  }

  if (phase === 'completed' && !trip.completedAt) {
    const [updated] = await db.update(podTrips)
      .set({ completedAt: new Date() })
      .where(and(
        eq(podTrips.id, trip.id),
        isNull(podTrips.completedAt)  // Optimistic lock
      ))
      .returning();
    return updated ?? trip;
  }

  return trip;
}
```

Call this in the `GET /api/trips/:id` route handler **after** auth check. The optimistic lock (`WHERE activatedAt IS NULL`) prevents race conditions if two requests trigger simultaneously.

### Lifecycle Phase Reversion

`traveling` can revert to `planning` if dates are edited to the future (e.g., family postpones). Clear `activatedAt` on revert.

`completed` is **terminal** -- it is a historical record with potential check-ins, photos, and ratings attached. Reverting would orphan that data. Only allow through an explicit admin action.

---

## Deployment Plan

### Step 1: Backup

```bash
pg_dump $DATABASE_URL > backup_before_trip_lifecycle_$(date +%Y%m%d).sql
```

### Step 2: Verify Existing Data

```sql
-- Check for malformed dates (should return 0 rows)
SELECT id, start_date, end_date FROM pod_trips
WHERE start_date !~ '^\d{4}-\d{2}-\d{2}$'
   OR end_date !~ '^\d{4}-\d{2}-\d{2}$';

-- Check current status values
SELECT DISTINCT status, COUNT(*) FROM pod_trips GROUP BY status;
```

### Step 3: Update Schema + db:push

Add `activatedAt` and `completedAt` to `shared/schema.ts`. Run `npm run db:push`.

### Step 4: Verify Columns Exist

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'pod_trips'
  AND column_name IN ('activated_at', 'completed_at');
```

### Step 5: Backfill Historical Trips

```sql
-- Mark past trips as completed (set completedAt to day after end_date)
UPDATE pod_trips
SET completed_at = (end_date || 'T23:59:59')::timestamp
WHERE end_date < CURRENT_DATE::text
  AND completed_at IS NULL;

-- Mark current trips as active (set activatedAt to start_date)
UPDATE pod_trips
SET activated_at = (start_date || 'T00:00:00')::timestamp
WHERE start_date <= CURRENT_DATE::text
  AND end_date >= CURRENT_DATE::text
  AND activated_at IS NULL;
```

### Step 6: Deploy Application Code

Deploy the security fixes, lifecycle computation, and UI changes.

### Step 7: Verify

```sql
SELECT
  CASE
    WHEN completed_at IS NOT NULL THEN 'completed'
    WHEN activated_at IS NOT NULL THEN 'traveling'
    ELSE 'planning'
  END AS lifecycle_phase,
  COUNT(*)
FROM pod_trips GROUP BY 1;
```

---

## Acceptance Criteria

### Security (BLOCKING -- do first)
- [x] `GET /api/trips/:id` requires auth and verifies ownership/pod membership
- [x] `PATCH /api/trips/:id` validates and whitelists allowed fields (no mass assignment)
- [x] `DELETE /api/trips/:id` verifies ownership
- [x] `GET /api/pods/:id/trips` requires auth and pod membership check
- [x] `GET /api/trips/:id/destinations` requires auth

### Schema
- [x] `podTrips` has new `activatedAt` (timestamp, nullable) column
- [x] `podTrips` has new `completedAt` (timestamp, nullable) column
- [ ] Migration runs cleanly via `npm run db:push`
- [x] `TripStatus` and `TripLifecyclePhase` type unions exported from `shared/schema.ts`
- [x] `updateTripStatus` in `storage.ts` accepts `TripStatus` (not `string`)

### Lifecycle Computation
- [x] `computeLifecyclePhase()` returns correct phase from timestamps and dates
- [x] Date comparison uses local-time parsing (`T00:00:00` / `T23:59:59`), not UTC
- [x] `syncLifecycleIfNeeded()` persists `activatedAt`/`completedAt` with optimistic locking
- [x] Phase computation runs on trip fetch (after auth), sets timestamps if needed
- [x] `activatedAt` is cleared if dates are edited to the future (revert from traveling)
- [x] `completedAt` is never cleared through normal flows (terminal state)

### Status Transitions
- [x] `validateStatusTransition()` enforces valid planning status transitions
- [x] Invalid transitions return 400 error with descriptive message

### API Responses
- [x] `GET /api/trips` and `GET /api/trips/:id` include `lifecyclePhase` in response
- [ ] Feed queries use date-range filters: `WHERE start_date <= NOW() AND end_date >= NOW()`

### UI
- [x] Trips list (`Trips.tsx`) shows visual distinction for traveling trips ("Traveling Now" badge)
- [x] Trips list shows completed trips in separate section or distinct styling
- [x] `TripDetails.tsx` renders differently based on lifecycle phase

### Data Migration
- [ ] Database backup taken before `db:push`
- [ ] Existing data verified (no malformed dates)
- [ ] Historical trips backfilled: past trips get `completedAt`, current trips get `activatedAt`

---

## Files to Create

- `server/lib/tripStatus.ts` -- Lifecycle computation, status transition validation, sync helper
- `server/lib/tripAuth.ts` -- Authorization middleware (`assertTripAccess`)

## Files to Modify

- `shared/schema.ts` -- Add `activatedAt`/`completedAt` columns, export type unions
- `server/storage.ts` -- Narrow `updateTripStatus` parameter type from `string` to `TripStatus`
- `server/routes.ts` -- Add auth to trip endpoints, integrate lifecycle sync, whitelist PATCH fields
- `client/src/pages/Trips.tsx` -- Visual treatment for traveling/completed trips
- `client/src/pages/TripDetails.tsx` -- Phase-aware header rendering
- `client/src/lib/api.ts` -- Any new endpoint methods needed

## Dependencies

- None beyond existing integrations. Geocoding and GCS deferred to later sprints.

## Blocks

This plan blocks:
- `feat-on-trip-experience.md` (needs `activatedAt` for active trip detection)
- `feat-trip-memories.md` (needs `completedAt` for completed trip detection)
- `feat-trip-discovery-social.md` (needs lifecycle phase for feed queries)

---

## Decisions Log

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Lifecycle tracking | Separate `lifecyclePhase` derived from timestamps | Extend existing `status` field | Planning status and lifecycle phase are orthogonal. Extending `status` loses workflow information. |
| Status computation | Pure compute-on-read from timestamps | Hybrid compute + write-back | No write side-effects on GET. No race conditions. No precedent for write-on-read in codebase. Negligible perf cost. |
| Scope | 2 columns (activatedAt, completedAt) | 8 columns (original plan) | YAGNI. Only these 2 are needed for Sprint 2. Each deferred column is a trivial ALTER TABLE. |
| Status types | TypeScript union + text({ enum }) | pgEnum | Codebase has 0 pgEnums across 40+ tables. pgEnum ALTER cannot run in transactions. Industry consensus: text + CHECK > pgEnum. |
| Coordinate type | `real` (deferred) | `numeric` | `numeric` returns strings in Drizzle. `real` matches existing `users.locationLat` and `experiences.locationLat`. |
| Date comparison | Local-time parsing with `T00:00:00` | Raw `new Date("YYYY-MM-DD")` (UTC) | UTC parsing causes off-by-one errors for users in western hemispheres. End-of-day comparison keeps trip active through the full last day. |
| Visibility default | Defer entirely | `DEFAULT 'pod'` | Adding visibility without enforcement creates false sense of security. Ship the field with the enforcement code (Sprint 5). |

## References

### Internal
- `shared/schema.ts:238` -- current podTrips table definition
- `shared/schema.ts:27-28` -- `users.locationLat/Lng` uses `real` (not numeric)
- `shared/schema.ts:68-69` -- `experiences.locationLat/Lng` uses `real`
- `server/storage.ts:1707` -- `updateTripStatus` accepts `string` (needs narrowing)
- `server/routes.ts:1897` -- `GET /api/trips/:id` has no auth (CRITICAL)
- `server/routes.ts:1995` -- `PATCH /api/trips/:id` no ownership check, mass assignment
- `server/routes.ts:2014` -- `DELETE /api/trips/:id` no ownership check
- `server/routes.ts:1821` -- `GET /api/pods/:id/trips` no auth
- `server/objectStorage.ts` -- GCS presigned URL upload pattern
- `client/src/pages/Trips.tsx` -- trip list UI
- `client/src/pages/TripDetails.tsx` -- trip detail UI (1522 lines)
- `client/src/components/shared/DateRangePicker.tsx:98` -- dates stored as `yyyy-MM-dd` format

### External Research
- [Crunchy Data: Enums vs CHECK Constraints](https://www.crunchydata.com/blog/enums-vs-check-constraints-in-postgres) -- text + CHECK preferred over pgEnum
- [Close.com: Native Enums or CHECK Constraints](https://making.close.com/posts/native-enums-or-check-constraints-in-postgresql/) -- same conclusion
- [Drizzle ORM: Push Documentation](https://orm.drizzle.team/docs/drizzle-kit-push) -- db:push for dev, generate+migrate for production
- [Microsoft Azure: Materialized View Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/materialized-view) -- related to hybrid status caching
- [PostgreSQL: Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) -- for future visibility enforcement
