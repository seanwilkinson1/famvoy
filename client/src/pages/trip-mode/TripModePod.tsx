import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { MessageCircle, ChevronRight, Users } from "lucide-react";
import TripModeLayout from "./TripModeLayout";

export default function TripModePod() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const tripId = Number(params.id);

  const { data: trip } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: () => api.trips.getById(tripId),
    enabled: !!tripId,
  });

  const { data: podDetails, isLoading } = useQuery({
    queryKey: ["podDetails", trip?.podId],
    queryFn: () => api.pods.getDetails(trip!.podId!),
    enabled: !!trip?.podId,
  });

  const podMembers = podDetails?.members || [];

  const { data: memories = [] } = useQuery({
    queryKey: ["tripMemories", tripId],
    queryFn: () => api.tripMemories.list(tripId),
    enabled: !!tripId,
  });

  // Recent shared moments (memories from other members)
  const sharedMoments = memories.slice(0, 5);

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
        <h2 className="text-white font-heading text-2xl font-semibold">Pod</h2>

        {/* Members list */}
        {!trip?.podId ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <Users className="w-8 h-8 text-white/30 mx-auto mb-2" />
            <h3 className="text-white text-lg font-semibold">Solo trip</h3>
            <p className="text-white/50 text-sm mt-1">
              This trip isn't linked to a pod
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {podMembers.map((member: any) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {member.profileImageUrl ? (
                      <img
                        src={member.profileImageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white/40 text-sm font-medium">
                        {(member.firstName || "?")[0]}
                      </span>
                    )}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {member.firstName} {member.lastName}
                    </p>
                  </div>

                  {/* Message button */}
                  <button
                    onClick={() => setLocation("/chat")}
                    className="p-2 rounded-full border border-white/10 text-white/40 hover:text-white hover:border-white/20 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Shared moments */}
            {sharedMoments.length > 0 && (
              <div>
                <h3 className="text-white/60 text-xs font-medium uppercase tracking-wider mb-3">
                  Shared Moments
                </h3>
                <div className="space-y-2">
                  {sharedMoments.map((memory: any) => (
                    <div
                      key={memory.id}
                      className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3"
                    >
                      {memory.emoji && (
                        <span className="text-xl shrink-0">{memory.emoji}</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white/80 text-sm truncate">
                          {memory.caption || "Moment logged"}
                        </p>
                        <p className="text-white/40 text-xs">
                          Day {memory.dayNumber} ·{" "}
                          {new Date(memory.loggedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/20" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </TripModeLayout>
  );
}
