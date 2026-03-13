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
import { Camera, CalendarPlus } from "lucide-react";

interface AddStopSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: number;
  dayNumber: number;
}

export function AddStopSheet({
  open,
  onOpenChange,
  tripId,
  dayNumber,
}: AddStopSheetProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const memoryMutation = useMutation({
    mutationFn: () =>
      api.tripMemories.create(tripId, {
        dayNumber,
        tripStopId: null,
        emoji: null,
        caption: title,
        tag: null,
        isHighlight: false,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tripMemories", tripId] });
      resetAndClose();
    },
  });

  const itemMutation = useMutation({
    mutationFn: () =>
      api.trips.addSpontaneousItem(tripId, {
        title,
        description: description || undefined,
        dayNumber,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tripLive", tripId] });
      resetAndClose();
    },
  });

  const resetAndClose = () => {
    setTitle("");
    setDescription("");
    onOpenChange(false);
  };

  const isPending = memoryMutation.isPending || itemMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-[#0D1117] border-white/10 rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="text-white text-lg font-semibold text-left">
            Add a Stop
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 pt-4 pb-2">
          {/* Title */}
          <div>
            <label className="text-white/60 text-xs font-medium uppercase tracking-wider block mb-2">
              What are you doing?
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Found a great gelato shop"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-white/60 text-xs font-medium uppercase tracking-wider block mb-2">
              Notes (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              placeholder="Any details..."
              rows={2}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none text-sm"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              size="pill"
              onClick={() => memoryMutation.mutate()}
              disabled={!title.trim() || isPending}
              className="flex-1 bg-white/10 text-white border border-white/20 hover:bg-white/20"
            >
              <Camera className="w-4 h-4 mr-1.5" />
              {memoryMutation.isPending ? "Saving..." : "Log as Memory"}
            </Button>
            <Button
              size="pill"
              onClick={() => itemMutation.mutate()}
              disabled={!title.trim() || isPending}
              className="flex-1 bg-white text-[#0D1117] hover:bg-white/90"
            >
              <CalendarPlus className="w-4 h-4 mr-1.5" />
              {itemMutation.isPending ? "Adding..." : "Add to Schedule"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
