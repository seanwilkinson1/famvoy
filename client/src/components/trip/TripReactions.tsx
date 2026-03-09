import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

const REACTION_TYPES = [
  { type: "love", emoji: "❤️" },
  { type: "wow", emoji: "😮" },
  { type: "clap", emoji: "👏" },
  { type: "fire", emoji: "🔥" },
  { type: "laugh", emoji: "😂" },
  { type: "heart_eyes", emoji: "😍" },
];

interface TripReactionsProps {
  tripId: number;
  currentUserId: number;
}

export function TripReactions({ tripId, currentUserId }: TripReactionsProps) {
  const queryClient = useQueryClient();

  const { data: reactions = [] } = useQuery({
    queryKey: ["/api/trips", tripId, "reactions"],
    queryFn: async () => {
      // Reactions are fetched via trip book or trip details endpoint
      // For now we use a simple approach
      return [] as any[];
    },
  });

  const addMutation = useMutation({
    mutationFn: (reactionType: string) => api.tripReactions.add(tripId, reactionType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (reactionType: string) => api.tripReactions.remove(tripId, reactionType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId] });
    },
  });

  // Count reactions by type
  const reactionCounts = REACTION_TYPES.map(({ type, emoji }) => {
    const count = reactions.filter((r: any) => r.reactionType === type).length;
    const hasReacted = reactions.some(
      (r: any) => r.reactionType === type && r.userId === currentUserId
    );
    return { type, emoji, count, hasReacted };
  });

  const handleToggle = (type: string, hasReacted: boolean) => {
    if (hasReacted) {
      removeMutation.mutate(type);
    } else {
      addMutation.mutate(type);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {reactionCounts.map(({ type, emoji, count, hasReacted }) => (
        <button
          key={type}
          onClick={() => handleToggle(type, hasReacted)}
          className={`text-sm px-2 py-1 rounded-full border transition-colors ${
            hasReacted
              ? "bg-primary/10 border-primary/30"
              : "bg-white border-gray-200 hover:border-primary/30"
          }`}
        >
          {emoji} {count > 0 && <span className="text-xs ml-0.5">{count}</span>}
        </button>
      ))}
    </div>
  );
}
