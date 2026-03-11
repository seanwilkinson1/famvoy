import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Sparkles } from "lucide-react";

const PROGRESS_MESSAGES = [
  "Researching your destination...",
  "Finding the best local spots...",
  "Building your daily itinerary...",
  "Adding restaurants and cafes...",
  "Optimizing your route...",
  "Adding family-friendly options...",
  "Polishing your trip plan...",
  "Almost there...",
];

export default function AIGeneration() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const tripId = new URLSearchParams(search).get("tripId");

  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const { data: trip } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: () => api.trips.getById(Number(tripId)),
    enabled: !!tripId,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!tripId) throw new Error("No trip ID");
      return api.trips.generate(Number(tripId), {
        tripInterests: trip?.travelStyleInterests || undefined,
        pace: trip?.travelStylePace || undefined,
        budgetMin: trip?.budgetMin || undefined,
        budgetMax: trip?.budgetMax || undefined,
      });
    },
    onSuccess: () => {
      setProgress(100);
      setTimeout(() => {
        setLocation(`/trip/${tripId}/plan`);
      }, 800);
    },
    onError: () => {
      // Still navigate to editor even on error — user can manually add stops
      setTimeout(() => {
        setLocation(`/trip/${tripId}/plan`);
      }, 1500);
    },
  });

  // Auto-start generation
  useEffect(() => {
    if (tripId && trip && !generateMutation.isPending && !generateMutation.isSuccess && !generateMutation.isError) {
      generateMutation.mutate();
    }
  }, [tripId, trip]);

  // Progress animation
  useEffect(() => {
    if (!generateMutation.isPending) return;

    const messageTimer = setInterval(() => {
      setMessageIndex((prev) => Math.min(prev + 1, PROGRESS_MESSAGES.length - 1));
    }, 3000);

    const progressTimer = setInterval(() => {
      setProgress((prev) => Math.min(prev + 2, 85));
    }, 500);

    return () => {
      clearInterval(messageTimer);
      clearInterval(progressTimer);
    };
  }, [generateMutation.isPending]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-5">
      <div className="flex flex-col items-center gap-8 max-w-sm text-center">
        {/* Progress ring */}
        <div className="relative">
          <ProgressRing
            current={progress}
            total={100}
            size={120}
            strokeWidth={4}
            showLabel={false}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-foreground animate-pulse" />
          </div>
        </div>

        {/* Status text */}
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground mb-2">
            {generateMutation.isError ? "We hit a snag" : "Building your trip"}
          </h1>
          <p className="text-muted-foreground transition-all duration-500">
            {generateMutation.isError
              ? "No worries — you can build your itinerary manually"
              : PROGRESS_MESSAGES[messageIndex]}
          </p>
        </div>

        {/* Trip info */}
        {trip && (
          <div className="px-5 py-3 rounded-full bg-muted text-sm font-medium text-foreground">
            {trip.destination} · {trip.name}
          </div>
        )}
      </div>
    </div>
  );
}
