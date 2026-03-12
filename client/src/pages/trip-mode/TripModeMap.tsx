import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { CheckCircle, Circle, MapPin, Navigation } from "lucide-react";
import TripModeLayout from "./TripModeLayout";

const TYPE_ICONS: Record<string, string> = {
  activity: "🏃",
  food: "🍽️",
  sightseeing: "🏛️",
  transport: "🚗",
  accommodation: "🏨",
};

export default function TripModeMap() {
  const params = useParams<{ id: string }>();
  const tripId = Number(params.id);

  const { data: liveState, isLoading } = useQuery({
    queryKey: ["tripLive", tripId],
    queryFn: () => api.trips.getLiveState(tripId),
    enabled: !!tripId,
  });

  if (isLoading) {
    return (
      <TripModeLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 rounded-full border-3 border-white/20 border-t-white animate-spin" />
        </div>
      </TripModeLayout>
    );
  }

  const { todayItems, allItems, trip } = liveState || { todayItems: [], allItems: [], trip: null };

  return (
    <TripModeLayout>
      <div className="px-5 space-y-6">
        {/* Map placeholder */}
        <div className="relative rounded-2xl border border-white/10 bg-white/5 h-64 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            {/* Grid pattern for map placeholder */}
            <div className="w-full h-full" style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }} />
          </div>
          <div className="text-center z-10">
            <MapPin className="w-8 h-8 text-white/30 mx-auto mb-2" />
            <p className="text-white/40 text-sm">Map coming soon</p>
            <p className="text-white/25 text-xs mt-1">{trip?.destination}</p>
          </div>

          {/* Open in Maps button */}
          {trip?.destination && (
            <a
              href={`https://maps.apple.com/?q=${encodeURIComponent(trip.destination)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-2 rounded-full bg-white text-[#0D1117] text-xs font-medium shadow-lg hover:bg-white/90 transition-colors"
            >
              <Navigation className="w-3.5 h-3.5" />
              Open in Maps
            </a>
          )}
        </div>

        {/* Stop list (all items across all days) */}
        <div>
          <h3 className="text-white/60 text-xs font-medium uppercase tracking-wider mb-3">
            All Stops
          </h3>
          <div className="space-y-2">
            {allItems.map((item: any) => {
              const isDone = item.isCheckedIn;
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-colors ${
                    isDone
                      ? "bg-emerald-500/5 border-emerald-500/20"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  {isDone ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-white/20 shrink-0" />
                  )}
                  <span className="text-lg shrink-0">
                    {TYPE_ICONS[item.itemType] || "📍"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isDone ? "text-white/50" : "text-white"}`}>
                      {item.title}
                    </p>
                    <p className="text-white/40 text-xs">
                      Day {item.dayNumber} · {item.time}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </TripModeLayout>
  );
}
