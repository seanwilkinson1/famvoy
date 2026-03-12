import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, MapPin, Calendar, CheckCircle, Loader2, BookOpen } from "lucide-react";
import { api } from "@/lib/api";
import { StarRating } from "@/components/trip/StarRating";
import { HighlightPicker } from "@/components/trip/HighlightPicker";
import { format } from "date-fns";

const ITEM_TYPE_ICONS: Record<string, string> = {
  ACTIVITY: "🎯",
  MEAL: "🍽️",
  STAY: "🏨",
  TRANSPORT: "🚗",
};

function getDayCount(startDate: string, endDate: string): number {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T23:59:59");
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
}

function getDayDate(startDate: string, dayNumber: number): Date {
  const start = new Date(startDate + "T00:00:00");
  start.setDate(start.getDate() + dayNumber - 1);
  return start;
}

export default function TripBook() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const tripId = parseInt(id!);

  const { data: bookData, isLoading } = useQuery({
    queryKey: ["/api/trips", tripId, "book"],
    queryFn: () => api.tripBook.get(tripId),
  });

  const ratingMutation = useMutation({
    mutationFn: (rating: number) => api.tripRating.set(tripId, rating),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "book"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!bookData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Trip not found</p>
      </div>
    );
  }

  const { trip, destinations, items, checkins, photos, highlights } = bookData;
  const dayCount = getDayCount(trip.startDate, trip.endDate);
  const checkedInItemIds = new Set(checkins.map((c: any) => c.tripItemId));

  // Group photos and items by day
  const photosByDay = new Map<number, any[]>();
  photos.forEach((photo: any) => {
    const day = photo.dayNumber || 1;
    if (!photosByDay.has(day)) photosByDay.set(day, []);
    photosByDay.get(day)!.push(photo);
  });

  const itemsByDay = new Map<number, any[]>();
  items.forEach((item: any) => {
    if (!itemsByDay.has(item.dayNumber)) itemsByDay.set(item.dayNumber, []);
    itemsByDay.get(item.dayNumber)!.push(item);
  });

  // Stats
  const totalPhotos = photos.length;
  const totalCheckins = checkins.length;
  const totalDestinations = destinations.length;

  return (
    <div className="min-h-screen bg-background md:max-w-5xl md:mx-auto md:px-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primary/80 text-white">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-8">
          <button
            onClick={() => navigate(`/trip/${tripId}`)}
            className="flex items-center gap-1 text-white/80 hover:text-white text-sm mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to trip
          </button>

          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-5 w-5" />
            <span className="text-sm font-medium text-white/80">Trip Book</span>
          </div>

          <h1 className="text-2xl font-display font-bold mb-1">{trip.name}</h1>
          <p className="text-white/70 text-sm">
            {trip.destination} &middot; {format(new Date(trip.startDate + "T00:00:00"), "MMM d")} - {format(new Date(trip.endDate + "T00:00:00"), "MMM d, yyyy")}
          </p>

          {/* Rating */}
          <div className="mt-4 flex items-center gap-3">
            <StarRating
              rating={trip.overallRating || 0}
              onRate={(r) => ratingMutation.mutate(r)}
              size="lg"
            />
            {!trip.overallRating && (
              <span className="text-xs text-white/60">Rate your trip</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Banner */}
      <div className="max-w-2xl mx-auto px-4 -mt-4">
        <div className="bg-white rounded-xl shadow-sm border p-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-foreground">{dayCount}</p>
            <p className="text-xs text-muted-foreground">Days</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{totalDestinations}</p>
            <p className="text-xs text-muted-foreground">Destinations</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{totalPhotos}</p>
            <p className="text-xs text-muted-foreground">Photos</p>
          </div>
        </div>
      </div>

      {/* Day-by-Day */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {Array.from({ length: dayCount }, (_, i) => i + 1).map((day) => {
          const dayItems = itemsByDay.get(day) || [];
          const dayPhotos = photosByDay.get(day) || [];
          const dayDate = getDayDate(trip.startDate, day);

          // Find destination for this day
          const destination = destinations.find((_d: any, idx: number) => {
            const dStart = new Date(destinations[idx].startDate + "T00:00:00");
            const dEnd = new Date(destinations[idx].endDate + "T23:59:59");
            return dayDate >= dStart && dayDate <= dEnd;
          });

          if (dayItems.length === 0 && dayPhotos.length === 0) return null;

          return (
            <motion.div
              key={day}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl shadow-sm border overflow-hidden"
            >
              {/* Day Header */}
              <div className="bg-gradient-to-r from-primary/5 to-transparent px-5 py-3 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display font-bold text-foreground">Day {day}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(dayDate, "EEEE, MMMM d")}
                    </p>
                  </div>
                  {destination && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {destination.destination}
                    </p>
                  )}
                </div>
              </div>

              {/* Day Photos */}
              {dayPhotos.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-0.5">
                  {dayPhotos.slice(0, 6).map((photo: any) => (
                    <div key={photo.id} className="aspect-square overflow-hidden">
                      <img
                        src={photo.photoUrl}
                        alt={photo.caption || "Trip photo"}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Day Items */}
              <div className="px-5 py-3 space-y-2">
                {dayItems.map((item: any) => {
                  const isCheckedIn = checkedInItemIds.has(item.id);
                  const checkin = checkins.find((c: any) => c.tripItemId === item.id);

                  return (
                    <div key={item.id} className="flex items-start gap-3 py-1.5">
                      <span className="text-lg mt-0.5">
                        {isCheckedIn ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <span>{ITEM_TYPE_ICONS[item.itemType] || "📌"}</span>
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.time}</p>
                        {checkin?.caption && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            "{checkin.caption}"
                          </p>
                        )}
                      </div>
                      <HighlightPicker
                        tripId={tripId}
                        tripItemId={item.id}
                        highlights={highlights}
                      />
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}

        {/* Highlights Summary */}
        {highlights.length > 0 && (
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
            <h3 className="font-display font-bold text-foreground mb-3">Trip Highlights</h3>
            <div className="space-y-2">
              {highlights.map((h: any) => {
                const item = items.find((i: any) => i.id === h.tripItemId);
                const typeLabel = {
                  favorite_moment: "⭐ Favorite Moment",
                  best_food: "🍽️ Best Food",
                  best_view: "🌅 Best View",
                  kids_favorite: "🧒 Kids' Favorite",
                }[h.highlightType as string] || h.highlightType;

                return (
                  <div key={h.id} className="flex items-center gap-2 text-sm">
                    <span>{typeLabel}</span>
                    {item && <span className="text-muted-foreground">— {item.title}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {items.length === 0 && photos.length === 0 && (
          <div className="text-center py-12">
            <Camera className="h-12 w-12 text-border mx-auto mb-3" />
            <p className="text-muted-foreground">
              No photos or check-ins yet. Add some memories to your trip!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
