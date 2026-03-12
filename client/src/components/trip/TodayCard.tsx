import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Camera, MapPin, Clock, Loader2, Undo2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface TripItem {
  id: number;
  tripId: number;
  dayNumber: number;
  dayTitle: string | null;
  time: string;
  title: string;
  description: string | null;
  itemType: string;
  sortOrder: number;
}

interface TodayCardProps {
  tripId: number;
  startDate: string;
  items: TripItem[];
}

const ITEM_TYPE_ICONS: Record<string, string> = {
  ACTIVITY: "🎯",
  MEAL: "🍽️",
  STAY: "🏨",
  TRANSPORT: "🚗",
};

function getDayNumber(tripStartDate: string): number {
  const now = new Date();
  const start = new Date(tripStartDate + "T00:00:00");
  return Math.max(1, Math.ceil((now.getTime() - start.getTime()) / 86_400_000) + 1);
}

export function TodayCard({ tripId, startDate, items }: TodayCardProps) {
  const queryClient = useQueryClient();
  const dayNumber = getDayNumber(startDate);

  const todayItems = items
    .filter((item) => item.dayNumber === dayNumber)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const tomorrowItems = items
    .filter((item) => item.dayNumber === dayNumber + 1)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const { data: checkins = [] } = useQuery({
    queryKey: ["/api/trips", tripId, "checkins"],
    queryFn: () => api.tripCheckins.listForTrip(tripId),
  });

  const checkedInItemIds = new Set(checkins.map((c: any) => c.tripItemId));

  if (todayItems.length === 0 && tomorrowItems.length === 0) {
    return null;
  }

  const completedCount = todayItems.filter((item) => checkedInItemIds.has(item.id)).length;

  return (
    <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border border-primary/20 p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-display font-bold text-foreground">
            Day {dayNumber}
          </h3>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d")}
          </p>
        </div>
        {todayItems.length > 0 && (
          <div className="text-sm font-medium text-primary">
            {completedCount}/{todayItems.length} done
          </div>
        )}
      </div>

      {todayItems.length > 0 && (
        <div className="space-y-2">
          {todayItems.map((item) => (
            <TodayItem
              key={item.id}
              item={item}
              tripId={tripId}
              isCheckedIn={checkedInItemIds.has(item.id)}
              dayNumber={dayNumber}
            />
          ))}
        </div>
      )}

      {tomorrowItems.length > 0 && (
        <div className="mt-5 pt-4 border-t border-primary/10">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Tomorrow
          </p>
          <div className="space-y-1.5 opacity-60">
            {tomorrowItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{ITEM_TYPE_ICONS[item.itemType] || "📌"}</span>
                <span className="text-xs text-muted-foreground/70">{item.time}</span>
                <span>{item.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface TodayItemProps {
  item: TripItem;
  tripId: number;
  isCheckedIn: boolean;
  dayNumber: number;
}

function TodayItem({ item, tripId, isCheckedIn, dayNumber }: TodayItemProps) {
  const queryClient = useQueryClient();
  const [showPhotoOption, setShowPhotoOption] = useState(false);

  const checkinMutation = useMutation({
    mutationFn: () => api.tripCheckins.create(tripId, item.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "checkins"] });
      toast.success(`Checked in: ${item.title}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const undoMutation = useMutation({
    mutationFn: () => api.tripCheckins.remove(tripId, item.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "checkins"] });
      toast("Check-in undone");
    },
  });

  const photoCheckinMutation = useMutation({
    mutationFn: async (file: File) => {
      const photoUrl = await api.upload.image(file);
      await api.tripCheckins.create(tripId, item.id, { photoUrl });
      await api.tripPhotos.create(tripId, { photoUrl, tripItemId: item.id, dayNumber });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "checkins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "photos"] });
      toast.success(`Checked in with photo: ${item.title}`);
      setShowPhotoOption(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) photoCheckinMutation.mutate(file);
  };

  const isPending = checkinMutation.isPending || photoCheckinMutation.isPending || undoMutation.isPending;

  return (
    <motion.div
      layout
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl transition-colors",
        isCheckedIn ? "bg-green-50 border border-green-200" : "bg-white border border-border",
      )}
    >
      <span className="text-lg">{ITEM_TYPE_ICONS[item.itemType] || "📌"}</span>

      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium truncate",
          isCheckedIn && "line-through text-muted-foreground",
        )}>
          {item.title}
        </p>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {item.time}
        </p>
      </div>

      {isPending ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : isCheckedIn ? (
        <button
          onClick={() => undoMutation.mutate()}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </button>
      ) : (
        <div className="flex items-center gap-1">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id={`photo-checkin-${item.id}`}
          />
          <button
            onClick={() => document.getElementById(`photo-checkin-${item.id}`)?.click()}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Check in with photo"
          >
            <Camera className="h-4 w-4" />
          </button>
          <button
            onClick={() => checkinMutation.mutate()}
            className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
            title="Check in"
          >
            <Check className="h-4 w-4" />
          </button>
        </div>
      )}
    </motion.div>
  );
}
