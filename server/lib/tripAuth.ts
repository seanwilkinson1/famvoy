import { storage } from "../storage";
import type { PodTrip, TripItem } from "@shared/schema";

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function assertTripAccess(
  userId: number,
  tripId: number,
  requiredLevel: "read" | "write" | "owner"
): Promise<PodTrip & { items: TripItem[] }> {
  const trip = await storage.getTripById(tripId);
  if (!trip) throw new NotFoundError("Trip not found");

  // Owner always has access
  if (trip.createdByUserId === userId) return trip;

  // Pod members have read and write access (not owner)
  if (trip.podId && requiredLevel !== "owner") {
    const isMember = await storage.isPodMember(trip.podId, userId);
    if (isMember) return trip;
  }

  throw new ForbiddenError("Not authorized to access this trip");
}
