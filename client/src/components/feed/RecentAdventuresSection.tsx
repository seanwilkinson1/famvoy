import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { api } from "@/lib/api";
import { StarRating } from "@/components/trip/StarRating";
import { MapPin, Copy, Loader2, Calendar, ChevronRight } from "lucide-react";
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
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-heading text-xl font-medium text-foreground">Recent Adventures</h2>
        <button className="text-sm font-medium text-muted-foreground flex items-center gap-0.5 hover:text-foreground transition-colors">
          See all <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-3">
        {trips.map((trip: any) => (
          <div
            key={trip.id}
            className="group rounded-2xl bg-card overflow-hidden transition-all hover:bg-muted/50"
          >
            <Link href={`/trip/${trip.id}`}>
              <div className="flex items-center gap-4 p-4 cursor-pointer">
                {/* Trip thumbnail */}
                <div className="h-14 w-14 flex-shrink-0 rounded-xl overflow-hidden bg-muted">
                  {trip.coverImage ? (
                    <img src={trip.coverImage} alt={trip.destination} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <MapPin className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {trip.creator?.firstName}'s trip
                  </p>
                  <h3 className="font-semibold text-sm text-foreground truncate">{trip.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {trip.destination}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(trip.startDate + "T00:00:00"), "MMM d")} –{" "}
                      {format(new Date(trip.endDate + "T00:00:00"), "MMM d")}
                    </span>
                  </div>
                </div>

                {/* Rating or copy */}
                <div className="flex-shrink-0 flex items-center gap-2">
                  {trip.overallRating && (
                    <StarRating rating={trip.overallRating} size="sm" readonly />
                  )}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      copyMutation.mutate(trip.id);
                    }}
                    disabled={copyMutation.isPending}
                    className="rounded-full border border-border px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-muted transition-colors flex items-center gap-1"
                  >
                    {copyMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    Copy
                  </button>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
