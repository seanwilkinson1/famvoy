import { db } from "../db";
import { podTrips } from "@shared/schema";
import type { PodTrip, TripStatus, TripLifecyclePhase } from "@shared/schema";
import { TRIP_STATUSES, TRIP_LIFECYCLE_PHASES } from "@shared/schema";
import { eq, and, isNull } from "drizzle-orm";

const VALID_STATUS_TRANSITIONS: Record<TripStatus, readonly TripStatus[]> = {
  draft: ["confirming"],
  confirming: ["confirmed", "draft"],
  confirmed: ["booking_in_progress"],
  booking_in_progress: ["booked"],
  booked: [],
} as const;

export function validateStatusTransition(from: TripStatus, to: TripStatus): boolean {
  return VALID_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export function computeLifecyclePhase(trip: {
  startDate: string;
  endDate: string;
  activatedAt: Date | null;
  completedAt: Date | null;
}): TripLifecyclePhase {
  if (trip.completedAt) return "completed";
  if (trip.activatedAt) return "traveling";

  const now = new Date();
  const start = new Date(trip.startDate + "T00:00:00");
  const endOfDay = new Date(trip.endDate + "T23:59:59");

  if (now > endOfDay) return "completed";
  if (now >= start && now <= endOfDay) return "traveling";
  return "planning";
}

export async function syncLifecycleIfNeeded(trip: PodTrip): Promise<PodTrip> {
  const phase = computeLifecyclePhase(trip);

  if (phase === "traveling" && !trip.activatedAt) {
    const [updated] = await db
      .update(podTrips)
      .set({ activatedAt: new Date() })
      .where(and(eq(podTrips.id, trip.id), isNull(podTrips.activatedAt)))
      .returning();
    return updated ?? trip;
  }

  if (phase === "completed" && !trip.completedAt) {
    const [updated] = await db
      .update(podTrips)
      .set({ completedAt: new Date() })
      .where(and(eq(podTrips.id, trip.id), isNull(podTrips.completedAt)))
      .returning();
    return updated ?? trip;
  }

  return trip;
}
