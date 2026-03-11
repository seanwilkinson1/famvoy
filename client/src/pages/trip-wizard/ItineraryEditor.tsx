import { useState, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Lock, Unlock, GripVertical, MapPin, Utensils, Camera, Bus, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ProgressRing } from "@/components/ui/progress-ring";
import { StickyFooter } from "@/components/ui/sticky-footer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TYPE_CONFIG: Record<string, { icon: typeof MapPin; color: string; bg: string }> = {
  activity: { icon: MapPin, color: "text-blue-600", bg: "bg-blue-50" },
  food: { icon: Utensils, color: "text-orange-600", bg: "bg-orange-50" },
  sightseeing: { icon: Camera, color: "text-purple-600", bg: "bg-purple-50" },
  transport: { icon: Bus, color: "text-gray-600", bg: "bg-gray-50" },
  accommodation: { icon: MapPin, color: "text-green-600", bg: "bg-green-50" },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] || TYPE_CONFIG.activity;
}

export default function ItineraryEditor() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: trip, isLoading } = useQuery({
    queryKey: ["trip", id],
    queryFn: () => api.trips.getById(Number(id)),
    enabled: !!id,
  });

  const items = trip?.items || [];

  // Group items by day
  const dayGroups = useMemo(() => {
    const groups: Record<number, { dayTitle: string; items: any[] }> = {};
    for (const item of items) {
      if (!groups[item.dayNumber]) {
        groups[item.dayNumber] = { dayTitle: item.dayTitle || `Day ${item.dayNumber}`, items: [] };
      }
      groups[item.dayNumber].items.push(item);
    }
    // Sort items within each day
    Object.values(groups).forEach((g) => g.items.sort((a: any, b: any) => a.sortOrder - b.sortOrder));
    return groups;
  }, [items]);

  const dayNumbers = Object.keys(dayGroups).map(Number).sort((a, b) => a - b);
  const [activeDay, setActiveDay] = useState<number>(dayNumbers[0] || 1);

  // Keep activeDay in bounds
  const currentDay = dayNumbers.includes(activeDay) ? activeDay : dayNumbers[0] || 1;
  const currentGroup = dayGroups[currentDay];

  const [lockedDays, setLockedDays] = useState<Set<number>>(new Set());

  const toggleLockDay = (day: number) => {
    setLockedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      await api.trips.deleteItem(itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", id] });
    },
  });

  const regenerateDayMutation = useMutation({
    mutationFn: async (dayNumber: number) => {
      await api.trips.regenerateDay(Number(id), dayNumber);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", id] });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
        <button onClick={() => window.history.back()} className="p-2 -ml-2 text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <ProgressRing current={4} total={5} size={40} strokeWidth={3} />
        <div className="w-9" /> {/* spacer */}
      </div>

      {/* Day tabs */}
      <div className="flex gap-2 px-5 py-3 overflow-x-auto border-b border-border/50">
        {dayNumbers.map((day) => (
          <button
            key={day}
            onClick={() => setActiveDay(day)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
              currentDay === day
                ? "bg-foreground text-background"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            {lockedDays.has(day) && <Lock className="w-3 h-3" />}
            Day {day}
          </button>
        ))}
      </div>

      {/* Day header */}
      <div className="flex items-center justify-between px-5 py-3">
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground">
            {currentGroup?.dayTitle || `Day ${currentDay}`}
          </h2>
          <p className="text-sm text-muted-foreground">
            {currentGroup?.items.length || 0} stops
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleLockDay(currentDay)}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
          >
            {lockedDays.has(currentDay) ? (
              <Lock className="w-5 h-5 text-foreground" />
            ) : (
              <Unlock className="w-5 h-5" />
            )}
          </button>
          {!lockedDays.has(currentDay) && (
            <Button
              variant="outline"
              size="pill-sm"
              onClick={() => regenerateDayMutation.mutate(currentDay)}
              disabled={regenerateDayMutation.isPending}
            >
              {regenerateDayMutation.isPending ? "Regenerating..." : "Regenerate"}
            </Button>
          )}
        </div>
      </div>

      {/* Stop cards */}
      <div className="flex-1 px-5 pb-32 space-y-3">
        {currentGroup?.items.map((item: any, index: number) => {
          const config = getTypeConfig(item.itemType);
          const Icon = config.icon;

          return (
            <div
              key={item.id}
              className="flex items-start gap-3 p-4 bg-card rounded-2xl border border-border/50 shadow-sm"
            >
              {!lockedDays.has(currentDay) && (
                <div className="pt-1 cursor-grab text-muted-foreground/40">
                  <GripVertical className="w-4 h-4" />
                </div>
              )}
              <div className={cn("flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center", config.bg)}>
                <Icon className={cn("w-5 h-5", config.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-muted-foreground">{item.time}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {item.itemType}
                  </span>
                </div>
                <h4 className="font-medium text-foreground text-sm leading-tight">{item.title}</h4>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                )}
              </div>
              {!lockedDays.has(currentDay) && (
                <button
                  onClick={() => deleteItemMutation.mutate(item.id)}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors p-1"
                >
                  Remove
                </button>
              )}
            </div>
          );
        })}

        {/* Add stop button */}
        {!lockedDays.has(currentDay) && (
          <button className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-border hover:border-primary/30 hover:bg-muted/30 transition-all text-muted-foreground">
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Add a stop</span>
          </button>
        )}

        {(!currentGroup || currentGroup.items.length === 0) && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No stops for this day yet</p>
          </div>
        )}
      </div>

      {/* Sticky footer */}
      <StickyFooter
        summary={
          <span className="text-sm text-muted-foreground">
            {items.length} stops across {dayNumbers.length} days
          </span>
        }
        action={
          <Button
            size="pill"
            onClick={() => setLocation(`/trip/${id}/finalize`)}
          >
            Review & Share
          </Button>
        }
      />
    </div>
  );
}
