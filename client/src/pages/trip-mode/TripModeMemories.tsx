import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Plus, Star, StarOff, BookOpen } from "lucide-react";
import { useState } from "react";
import { MemoryLogSheet } from "@/components/trip/MemoryLogSheet";
import TripModeLayout from "./TripModeLayout";

export default function TripModeMemories() {
  const params = useParams<{ id: string }>();
  const tripId = Number(params.id);
  const [memorySheetOpen, setMemorySheetOpen] = useState(false);

  const { data: liveState } = useQuery({
    queryKey: ["tripLive", tripId],
    queryFn: () => api.trips.getLiveState(tripId),
    enabled: !!tripId,
  });

  const { data: memories = [], isLoading } = useQuery({
    queryKey: ["tripMemories", tripId],
    queryFn: () => api.tripMemories.list(tripId),
    enabled: !!tripId,
  });

  const currentDay = liveState?.currentDay || 1;

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
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-white font-heading text-2xl font-semibold">Memories</h2>
          <button
            onClick={() => setMemorySheetOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-[#0D1117] text-sm font-medium hover:bg-white/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        {/* Memory feed */}
        {memories.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <div className="text-4xl mb-3">📸</div>
            <h3 className="text-white text-lg font-semibold">No memories yet</h3>
            <p className="text-white/50 text-sm mt-1">
              Tap "Add" to log your first moment
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {memories.map((memory: any) => (
              <div
                key={memory.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3"
              >
                {/* Memory header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {memory.emoji && (
                      <span className="text-2xl">{memory.emoji}</span>
                    )}
                    <div>
                      <p className="text-white/40 text-xs">
                        Day {memory.dayNumber} ·{" "}
                        {new Date(memory.loggedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {memory.tag && (
                        <span className="text-white/30 text-xs capitalize">{memory.tag}</span>
                      )}
                    </div>
                  </div>
                  <button className="p-1 text-white/30 hover:text-yellow-400 transition-colors">
                    {memory.isHighlight ? (
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ) : (
                      <StarOff className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Caption */}
                {memory.caption && (
                  <p className="text-white/80 text-sm">{memory.caption}</p>
                )}

                {/* Photos */}
                {memory.photos && memory.photos.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto -mx-1 px-1">
                    {memory.photos.map((photo: string, i: number) => (
                      <img
                        key={i}
                        src={photo}
                        alt=""
                        className="h-32 w-32 rounded-xl object-cover shrink-0"
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Booklet preview CTA */}
        {memories.length >= 3 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-white/40 shrink-0" />
            <div className="flex-1">
              <p className="text-white text-sm font-medium">Create your trip booklet</p>
              <p className="text-white/40 text-xs">Turn your memories into a keepsake</p>
            </div>
            <span className="text-white/30 text-xs">Coming soon</span>
          </div>
        )}
      </div>

      <MemoryLogSheet
        open={memorySheetOpen}
        onOpenChange={setMemorySheetOpen}
        tripId={tripId}
        dayNumber={currentDay}
      />
    </TripModeLayout>
  );
}
