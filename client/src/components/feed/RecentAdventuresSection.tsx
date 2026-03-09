import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { StarRating } from "@/components/trip/StarRating";
import { MapPin, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export function RecentAdventuresSection() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: trips = [] } = useQuery({
    queryKey: ["/api/feed/recent-adventures"],
    queryFn: () => api.feedRecentAdventures.get(),
  });

  const copyMutation = useMutation({
    mutationFn: (tripId: number) => api.copyTrip.copy(tripId),
    onSuccess: (newTrip: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      setLocation(`/trip/${newTrip.id}`);
    },
  });

  if (trips.length === 0) return null;

  return (
    <div className="mb-6 px-4">
      <h2 className="font-display font-bold text-charcoal text-lg flex items-center gap-2 mb-3">
        <MapPin className="h-5 w-5 text-warm-coral" />
        Recent Adventures
      </h2>
      <div className="space-y-3">
        {trips.map((trip: any) => (
          <div
            key={trip.id}
            className="bg-white rounded-xl border shadow-sm overflow-hidden"
          >
            <button
              onClick={() => setLocation(`/trip/${trip.id}`)}
              className="w-full text-left p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {trip.creator?.firstName}'s trip
                  </p>
                  <p className="font-display font-bold text-charcoal truncate">
                    {trip.name}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {trip.destination}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(trip.startDate + "T00:00:00"), "MMM d")} -{" "}
                    {format(new Date(trip.endDate + "T00:00:00"), "MMM d, yyyy")}
                  </p>
                </div>
                {trip.overallRating && (
                  <StarRating rating={trip.overallRating} size="sm" readonly />
                )}
              </div>
            </button>
            <div className="border-t px-4 py-2 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyMutation.mutate(trip.id)}
                disabled={copyMutation.isPending}
                className="text-xs text-primary"
              >
                {copyMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Copy className="h-3 w-3 mr-1" />
                )}
                Copy This Trip
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
