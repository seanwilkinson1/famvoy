import { useLocation, useParams } from "wouter";
import { ArrowLeft, MapPin, Calendar, Users, Lock, Share2, CheckCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ProgressRing } from "@/components/ui/progress-ring";
import { StickyFooter } from "@/components/ui/sticky-footer";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";

export default function LockAndShare() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: trip, isLoading } = useQuery({
    queryKey: ["trip", id],
    queryFn: () => api.trips.getById(Number(id)),
    enabled: !!id,
  });

  const items = trip?.items || [];

  const dayGroups = useMemo(() => {
    const groups: Record<number, { dayTitle: string; count: number }> = {};
    for (const item of items) {
      if (!groups[item.dayNumber]) {
        groups[item.dayNumber] = { dayTitle: item.dayTitle || `Day ${item.dayNumber}`, count: 0 };
      }
      groups[item.dayNumber].count++;
    }
    return groups;
  }, [items]);

  const dayNumbers = Object.keys(dayGroups).map(Number).sort((a, b) => a - b);

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      await api.trips.update(Number(id), { status: "planning" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", id] });
      setLocation(`/trip/${id}`);
    },
  });

  const formatDateRange = () => {
    if (!trip) return "";
    const start = new Date(trip.startDate + "T00:00:00");
    const end = new Date(trip.endDate + "T00:00:00");
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return `${start.toLocaleDateString("en-US", opts)} — ${end.toLocaleDateString("en-US", opts)}`;
  };

  const totalNights = () => {
    if (!trip) return 0;
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    return Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  };

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
      <div className="flex items-center justify-between px-5 py-4">
        <button onClick={() => window.history.back()} className="p-2 -ml-2 text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <ProgressRing current={5} total={5} size={40} strokeWidth={3} />
        <div className="w-9" />
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pb-32">
        <h1 className="font-heading text-3xl font-semibold text-foreground text-center mt-4 mb-2">
          Looking good!
        </h1>
        <p className="text-muted-foreground text-center mb-8">
          Review your trip and share with your pod
        </p>

        {/* Trip summary card */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 mb-6 max-w-md mx-auto">
          <h2 className="font-heading text-xl font-semibold text-foreground mb-4">{trip?.name}</h2>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span>{trip?.destination}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>{formatDateRange()} · {totalNights()} nights</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Users className="w-4 h-4 flex-shrink-0" />
              <span>{(trip?.adultsCount || 2) + (trip?.kidsCount || 0)} travelers</span>
            </div>
          </div>
        </div>

        {/* Day breakdown */}
        <div className="space-y-2 max-w-md mx-auto mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">Itinerary</h3>
          {dayNumbers.map((day) => {
            const group = dayGroups[day];
            return (
              <div key={day} className="flex items-center justify-between px-4 py-3 bg-card rounded-xl border border-border/50">
                <div className="flex items-center gap-3">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{group.dayTitle}</p>
                    <p className="text-xs text-muted-foreground">{group.count} stops</p>
                  </div>
                </div>
                <CheckCircle className="w-5 h-5 text-accent" />
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="space-y-3 max-w-md mx-auto">
          <button
            onClick={() => setLocation(`/trip/${id}/plan`)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-card rounded-xl border border-border/50 hover:bg-muted/30 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <MapPin className="w-5 h-5 text-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground">Edit itinerary</span>
          </button>

          <button className="w-full flex items-center gap-3 px-4 py-3 bg-card rounded-xl border border-border/50 hover:bg-muted/30 transition-colors">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Share2 className="w-5 h-5 text-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground">Share with pod</span>
          </button>
        </div>
      </div>

      {/* Sticky footer */}
      <StickyFooter
        summary={
          <span className="text-sm text-muted-foreground">
            {items.length} stops · {dayNumbers.length} days
          </span>
        }
        action={
          <Button
            size="pill"
            onClick={() => finalizeMutation.mutate()}
            disabled={finalizeMutation.isPending}
          >
            {finalizeMutation.isPending ? "Saving..." : "Start Trip"}
          </Button>
        }
      />
    </div>
  );
}
