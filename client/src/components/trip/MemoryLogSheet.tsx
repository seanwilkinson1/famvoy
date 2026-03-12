import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

const EMOJI_OPTIONS = [
  "😍", "🤩", "😋", "😌", "🥳",
  "😎", "🫶", "😮", "🤔", "😂",
];

const TAG_OPTIONS = [
  { value: "milestone", label: "Milestone" },
  { value: "food", label: "Food" },
  { value: "scenery", label: "Scenery" },
  { value: "culture", label: "Culture" },
  { value: "family", label: "Family" },
  { value: "history", label: "History" },
];

interface MemoryLogSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: number;
  dayNumber: number;
  stopName?: string;
  tripStopId?: number;
}

export function MemoryLogSheet({
  open,
  onOpenChange,
  tripId,
  dayNumber,
  stopName,
  tripStopId,
}: MemoryLogSheetProps) {
  const queryClient = useQueryClient();
  const [emoji, setEmoji] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [tag, setTag] = useState<string>("");

  const createMutation = useMutation({
    mutationFn: () =>
      api.tripMemories.create(tripId, {
        dayNumber,
        tripStopId: tripStopId || null,
        emoji: emoji || null,
        caption: caption || null,
        tag: tag || null,
        isHighlight: false,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tripMemories", tripId] });
      queryClient.invalidateQueries({ queryKey: ["tripLive", tripId] });
      resetAndClose();
    },
  });

  const resetAndClose = () => {
    setEmoji("");
    setCaption("");
    setTag("");
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-[#0D1117] border-white/10 rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="text-white text-lg font-semibold text-left">
            Log a Memory
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 pt-4 pb-2">
          {/* Stop context */}
          {stopName && (
            <div className="flex items-center gap-2 text-white/50 text-sm">
              <MapPin className="w-4 h-4" />
              <span>At: {stopName}</span>
            </div>
          )}

          {/* Emoji mood picker */}
          <div>
            <label className="text-white/60 text-xs font-medium uppercase tracking-wider block mb-2">
              How are you feeling?
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(emoji === e ? "" : e)}
                  className={`text-2xl w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    emoji === e
                      ? "bg-white/15 ring-2 ring-white/30 scale-110"
                      : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Caption */}
          <div>
            <label className="text-white/60 text-xs font-medium uppercase tracking-wider block mb-2">
              Caption
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, 500))}
              placeholder="What happened?"
              rows={3}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none text-sm"
            />
            <p className="text-white/30 text-xs text-right mt-1">{caption.length}/500</p>
          </div>

          {/* Tag selector */}
          <div>
            <label className="text-white/60 text-xs font-medium uppercase tracking-wider block mb-2">
              Tag
            </label>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTag(tag === t.value ? "" : t.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    tag === t.value
                      ? "bg-white/15 border-white/30 text-white"
                      : "bg-white/5 border-white/10 text-white/50 hover:text-white/70"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Save button */}
          <Button
            size="pill"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || (!caption && !emoji)}
            className="w-full bg-white text-[#0D1117] hover:bg-white/90"
          >
            {createMutation.isPending ? "Saving..." : "Save Memory"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
