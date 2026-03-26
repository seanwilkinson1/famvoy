import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { CheckCircle, Circle, Clock, MapPin, ChevronRight, Sparkles, Plus, Navigation } from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { MemoryLogSheet } from "@/components/trip/MemoryLogSheet";
import { AddStopSheet } from "@/components/trip/AddStopSheet";
import TripModeLayout from "./TripModeLayout";
import { calculateDistance, getNavigationUrl } from "@/lib/utils";

const TYPE_COLORS: Record<string, string> = {
  activity: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  food: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  sightseeing: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  transport: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  accommodation: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

/** Parse a time string like "09:00 AM" or "2:30 PM" into minutes since midnight */
function parseTimeToMinutes(time: string): number | null {
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

/** Find the index of the time-based "current" item — the last item whose time has passed */
function findTimeBasedCurrentIndex(items: any[]): number {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  let currentIdx = -1;
  for (let i = 0; i < items.length; i++) {
    if (items[i].isCheckedIn) continue;
    const itemMinutes = parseTimeToMinutes(items[i].time);
    if (itemMinutes !== null && itemMinutes <= nowMinutes) {
      currentIdx = i;
    }
  }

  // If no item's time has passed yet, use the first unchecked item
  if (currentIdx === -1) {
    currentIdx = items.findIndex((item: any) => !item.isCheckedIn);
  }

  return currentIdx;
}

export default function TripModeToday() {
  const params = useParams<{ id: string }>();
  const tripId = Number(params.id);
  const queryClient = useQueryClient();
  const [memorySheetOpen, setMemorySheetOpen] = useState(false);
  const [addStopSheetOpen, setAddStopSheetOpen] = useState(false);
  const [selectedItemForMemory, setSelectedItemForMemory] = useState<any>(null);
  const currentItemRef = useRef<HTMLDivElement>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Get user's GPS position (low-accuracy, battery-friendly)
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}, // silently ignore errors
      { enableHighAccuracy: false, maximumAge: 10000, timeout: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const { data: liveState, isLoading } = useQuery({
    queryKey: ["tripLive", tripId],
    queryFn: () => api.trips.getLiveState(tripId),
    refetchInterval: 30000,
    enabled: !!tripId,
  });

  const checkinMutation = useMutation({
    mutationFn: ({ itemId }: { itemId: number }) =>
      api.tripCheckins.create(tripId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tripLive", tripId] });
    },
  });

  const { currentDay, totalDays, todayItems, progress } = liveState || {
    currentDay: 1,
    totalDays: 1,
    todayItems: [],
    progress: { totalItems: 0, checkedInCount: 0, percentage: 0 },
  };

  // Time-based current item highlighting
  const currentItemIndex = useMemo(
    () => findTimeBasedCurrentIndex(todayItems),
    [todayItems]
  );
  const currentItem = currentItemIndex >= 0 ? todayItems[currentItemIndex] : null;

  // Auto-scroll to current item on mount
  useEffect(() => {
    if (currentItemRef.current) {
      currentItemRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentItemIndex]);

  if (isLoading) {
    return (
      <TripModeLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 rounded-full border-3 border-white/20 border-t-white animate-spin" />
        </div>
      </TripModeLayout>
    );
  }

  return (
    <TripModeLayout>
      <div className="px-5 space-y-6">
        {/* Day header + progress */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-heading text-2xl font-semibold">
              Day {currentDay}
            </h2>
            <p className="text-white/50 text-sm">of {totalDays} days</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <span className="text-white/50 text-xs">{progress.percentage}%</span>
          </div>
        </div>

        {/* Current stop hero card */}
        {currentItem ? (
          <div ref={currentItemRef} className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${TYPE_COLORS[currentItem.itemType] || TYPE_COLORS.activity}`}>
                  {currentItem.itemType}
                </span>
                <h3 className="text-white text-xl font-semibold mt-2">
                  {currentItem.title}
                </h3>
                {currentItem.description && (
                  <p className="text-white/60 text-sm mt-1 line-clamp-2">
                    {currentItem.description}
                  </p>
                )}
              </div>
              <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
            </div>

            <div className="flex items-center gap-4 text-white/50 text-sm">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {currentItem.time}
              </span>
              {userLocation && currentItem.locationLat && currentItem.locationLng && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {calculateDistance(userLocation.lat, userLocation.lng, currentItem.locationLat, currentItem.locationLng).toFixed(1)} mi away
                </span>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => checkinMutation.mutate({ itemId: currentItem.id })}
                disabled={checkinMutation.isPending}
                className="flex-1 h-12 rounded-full bg-white text-[#0D1117] font-medium text-sm hover:bg-white/90 transition-colors disabled:opacity-50"
              >
                {checkinMutation.isPending ? "Checking in..." : "Check In"}
              </button>
              {currentItem.locationLat && currentItem.locationLng && (
                <a
                  href={getNavigationUrl(currentItem.locationLat, currentItem.locationLng)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-12 w-12 rounded-full border border-white/20 text-white flex items-center justify-center hover:bg-white/5 transition-colors"
                >
                  <Navigation className="w-5 h-5" />
                </a>
              )}
              <button
                onClick={() => {
                  setSelectedItemForMemory(currentItem);
                  setMemorySheetOpen(true);
                }}
                className="h-12 px-5 rounded-full border border-white/20 text-white text-sm font-medium hover:bg-white/5 transition-colors"
              >
                Log Memory
              </button>
            </div>
          </div>
        ) : todayItems.length > 0 ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-center">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <h3 className="text-white text-lg font-semibold">All done for today!</h3>
            <p className="text-white/50 text-sm mt-1">You've checked in everywhere</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
            <p className="text-white/50">No stops planned for today</p>
          </div>
        )}

        {/* Up Next strip */}
        {currentItemIndex >= 0 && currentItemIndex < todayItems.length - 1 && (() => {
          const nextItem = todayItems[currentItemIndex + 1];
          const distToNext = (userLocation && nextItem.locationLat && nextItem.locationLng)
            ? calculateDistance(userLocation.lat, userLocation.lng, nextItem.locationLat, nextItem.locationLng)
            : null;
          return (
            <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
              <ChevronRight className="w-4 h-4 text-white/40" />
              <div className="flex-1 min-w-0">
                <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Up next</p>
                <p className="text-white text-sm font-medium truncate">
                  {nextItem.title}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-white/40 text-xs">{nextItem.time}</span>
                {distToNext !== null && (
                  <p className="text-white/30 text-[10px]">{distToNext.toFixed(1)} mi</p>
                )}
              </div>
            </div>
          );
        })()}

        {/* Day timeline */}
        <div className="space-y-1">
          <h3 className="text-white/60 text-xs font-medium uppercase tracking-wider mb-3">
            Today's Timeline
          </h3>
          {todayItems.map((item: any, index: number) => {
            const isCurrent = index === currentItemIndex;
            const isDone = item.isCheckedIn;

            return (
              <div
                key={item.id}
                className={`flex items-start gap-3 py-2 rounded-lg transition-colors ${
                  isCurrent ? "bg-white/5 -mx-2 px-2 ring-1 ring-white/10" : ""
                }`}
              >
                {/* Timeline dot */}
                <div className="flex flex-col items-center pt-0.5">
                  {isDone ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  ) : isCurrent ? (
                    <div className="relative">
                      <Circle className="w-5 h-5 text-white" />
                      <span className="absolute inset-0 rounded-full animate-ping bg-white/20" />
                    </div>
                  ) : (
                    <Circle className="w-5 h-5 text-white/20" />
                  )}
                  {index < todayItems.length - 1 && (
                    <div className={`w-px h-8 mt-1 ${isDone ? "bg-emerald-500/30" : "bg-white/10"}`} />
                  )}
                </div>

                {/* Item details */}
                <div className={`flex-1 min-w-0 ${isDone ? "opacity-50" : ""}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-white/40 text-xs w-12">{item.time}</span>
                    <span className={`text-sm font-medium ${isCurrent ? "text-white" : "text-white/70"}`}>
                      {item.title}
                    </span>
                  </div>
                </div>

                {/* Quick actions */}
                {!isDone && !isCurrent && (
                  <button
                    onClick={() => checkinMutation.mutate({ itemId: item.id })}
                    className="text-white/30 hover:text-white/60 p-1 transition-colors"
                  >
                    <MapPin className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Stop FAB */}
      <button
        onClick={() => setAddStopSheetOpen(true)}
        className="fixed bottom-24 right-5 z-40 w-14 h-14 rounded-full bg-white text-[#0D1117] shadow-lg flex items-center justify-center hover:bg-white/90 active:scale-95 transition-all"
      >
        <Plus className="w-6 h-6" />
      </button>

      <MemoryLogSheet
        open={memorySheetOpen}
        onOpenChange={setMemorySheetOpen}
        tripId={tripId}
        dayNumber={currentDay}
        stopName={selectedItemForMemory?.title}
        tripStopId={selectedItemForMemory?.id}
      />

      <AddStopSheet
        open={addStopSheetOpen}
        onOpenChange={setAddStopSheetOpen}
        tripId={tripId}
        dayNumber={currentDay}
      />
    </TripModeLayout>
  );
}
