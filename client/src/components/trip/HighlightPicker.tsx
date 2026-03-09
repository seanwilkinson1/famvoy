import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface HighlightPickerProps {
  tripId: number;
  tripItemId?: number;
  highlights: any[];
}

const HIGHLIGHT_TYPES = [
  { value: "favorite_moment", label: "Favorite Moment", emoji: "⭐" },
  { value: "best_food", label: "Best Food", emoji: "🍽️" },
  { value: "best_view", label: "Best View", emoji: "🌅" },
  { value: "kids_favorite", label: "Kids' Favorite", emoji: "🧒" },
];

export function HighlightPicker({ tripId, tripItemId, highlights }: HighlightPickerProps) {
  const queryClient = useQueryClient();
  const [showPicker, setShowPicker] = useState(false);

  const existingHighlight = highlights.find(
    (h: any) => h.tripItemId === (tripItemId ?? null),
  );

  const addMutation = useMutation({
    mutationFn: (highlightType: string) =>
      api.tripHighlights.create(tripId, { tripItemId, highlightType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "book"] });
      setShowPicker(false);
      toast.success("Highlight added");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeMutation = useMutation({
    mutationFn: (highlightId: number) =>
      api.tripHighlights.remove(tripId, highlightId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "book"] });
      toast("Highlight removed");
    },
  });

  if (existingHighlight) {
    const type = HIGHLIGHT_TYPES.find((t) => t.value === existingHighlight.highlightType);
    return (
      <button
        onClick={() => removeMutation.mutate(existingHighlight.id)}
        disabled={removeMutation.isPending}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-700 hover:bg-amber-100 transition-colors"
      >
        <span>{type?.emoji || "⭐"}</span>
        <span>{type?.label || existingHighlight.highlightType}</span>
        <X className="h-3 w-3" />
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="p-1 rounded-lg hover:bg-amber-50 text-muted-foreground hover:text-amber-600 transition-colors"
        title="Add highlight"
      >
        <Sparkles className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute right-0 top-8 z-10 bg-white rounded-xl shadow-lg border p-2 min-w-[180px]"
          >
            {HIGHLIGHT_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => addMutation.mutate(type.value)}
                disabled={addMutation.isPending}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span>{type.emoji}</span>
                <span>{type.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
