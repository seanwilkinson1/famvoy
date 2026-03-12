import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { CheckCircle, Circle, Clock, MapPin, ChevronRight, Sparkles } from "lucide-react";
import { useState } from "react";
import { MemoryLogSheet } from "@/components/trip/MemoryLogSheet";
import TripModeLayout from "./TripModeLayout";

const TYPE_COLORS: Record<string, string> = {
  activity: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  food: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  sightseeing: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  transport: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  accommodation: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

export default function TripModeToday() {
  const params = useParams<{ id: string }>();
  const tripId = Number(params.id);
  const queryClient = useQueryClient();
  const [memorySheetOpen, setMemorySheetOpen] = useState(false);
  const [selectedItemForMemory, setSelectedItemForMemory] = useState<any>(null);

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

  if (isLoading) {
    return (
      <TripModeLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 rounded-full border-3 border-white/20 border-t-white animate-spin" />
        </div>
      </TripModeLayout>
    );
  }

  const { currentDay, totalDays, todayItems, progress } = liveState || {
    currentDay: 1,
    totalDays: 1,
    todayItems: [],
    progress: { totalItems: 0, checkedInCount: 0, percentage: 0 },
  };

  // Find current (first unchecked) item
  const currentItemIndex = todayItems.findIndex((item: any) => !item.isCheckedIn);
  const currentItem = currentItemIndex >= 0 ? todayItems[currentItemIndex] : null;

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
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
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
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => checkinMutation.mutate({ itemId: currentItem.id })}
                disabled={checkinMutation.isPending}
                className="flex-1 h-12 rounded-full bg-white text-[#0D1117] font-medium text-sm hover:bg-white/90 transition-colors disabled:opacity-50"
              >
                {checkinMutation.isPending ? "Checking in..." : "Check In"}
              </button>
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
        {currentItemIndex >= 0 && currentItemIndex < todayItems.length - 1 && (
          <div className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
            <ChevronRight className="w-4 h-4 text-white/40" />
            <div className="flex-1 min-w-0">
              <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Up next</p>
              <p className="text-white text-sm font-medium truncate">
                {todayItems[currentItemIndex + 1].title}
              </p>
            </div>
            <span className="text-white/40 text-xs">{todayItems[currentItemIndex + 1].time}</span>
          </div>
        )}

        {/* Day timeline */}
        <div className="space-y-1">
          <h3 className="text-white/60 text-xs font-medium uppercase tracking-wider mb-3">
            Today's Timeline
          </h3>
          {todayItems.map((item: any, index: number) => {
            const isCurrent = index === currentItemIndex;
            const isDone = item.isCheckedIn;

            return (
              <div key={item.id} className="flex items-start gap-3 py-2">
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

      <MemoryLogSheet
        open={memorySheetOpen}
        onOpenChange={setMemorySheetOpen}
        tripId={tripId}
        dayNumber={currentDay}
        stopName={selectedItemForMemory?.title}
        tripStopId={selectedItemForMemory?.id}
      />
    </TripModeLayout>
  );
}
