import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { MapPin, Plane } from "lucide-react";

export function TravelingNowSection() {
  const [, setLocation] = useLocation();

  const { data: trips = [] } = useQuery({
    queryKey: ["/api/feed/traveling-now"],
    queryFn: () => api.feedTravelingNow.get(),
  });

  if (trips.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="font-display font-bold text-foreground text-lg flex items-center gap-2 mb-3 px-4">
        <Plane className="h-5 w-5 text-primary" />
        Traveling Now
      </h2>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {trips.map((trip: any) => (
          <button
            key={trip.id}
            onClick={() => setLocation(`/trip/${trip.id}`)}
            className="flex-shrink-0 w-48 bg-white rounded-xl border shadow-sm overflow-hidden text-left"
          >
            <div className="bg-gradient-to-br from-primary/20 to-primary/5 h-20 flex items-center justify-center">
              <MapPin className="h-8 w-8 text-primary/40" />
            </div>
            <div className="p-3">
              <p className="text-xs text-muted-foreground">
                {trip.creator?.firstName || "Someone"} is in
              </p>
              <p className="font-display font-bold text-foreground text-sm truncate">
                {trip.destination}
              </p>
              <p className="text-xs text-primary mt-1">{trip.name}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
