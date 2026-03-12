import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ProgressRing } from "@/components/ui/progress-ring";
import { StickyFooter } from "@/components/ui/sticky-footer";
import { FilterChip } from "@/components/ui/filter-chip";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { Button } from "@/components/ui/button";

const INTERESTS = [
  "Culture & History",
  "Food & Dining",
  "Outdoor Adventure",
  "Beach & Relaxation",
  "Art & Museums",
  "Shopping",
  "Nightlife",
  "Family Activities",
  "Nature & Wildlife",
  "Sports & Fitness",
  "Photography",
  "Local Experiences",
];

const PACE_OPTIONS = [
  { value: "relaxed", label: "Relaxed" },
  { value: "balanced", label: "Balanced" },
  { value: "packed", label: "Packed" },
];

const BUDGET_OPTIONS = [
  { value: "budget", label: "Budget" },
  { value: "midrange", label: "Mid-range" },
  { value: "splurge", label: "Splurge" },
];

export default function TravelStyle() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const tripId = new URLSearchParams(search).get("tripId");

  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [pace, setPace] = useState<string>("balanced");
  const [budget, setBudget] = useState<string>("midrange");

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!tripId) return;
      await api.trips.update(Number(tripId), {
        travelStyleInterests: selectedInterests,
        travelStylePace: pace,
        travelStyleBudget: budget,
      });
    },
    onSuccess: () => {
      setLocation(`/trips/new/generate?tripId=${tripId}`);
    },
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-4">
        <button onClick={() => window.history.back()} className="p-2 -ml-2 text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <ProgressRing current={2} total={5} size={40} strokeWidth={3} />
        <button onClick={() => setLocation("/trips")} className="text-sm text-muted-foreground font-medium">
          Skip
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pb-32">
        <h1 className="font-heading text-3xl font-semibold text-foreground text-center mt-4 mb-2">
          How do you travel?
        </h1>
        <p className="text-muted-foreground text-center mb-8">
          This helps us personalize your itinerary
        </p>

        <div className="space-y-8 max-w-md mx-auto">
          {/* Interests */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">What interests you?</h3>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((interest) => (
                <FilterChip
                  key={interest}
                  active={selectedInterests.includes(interest)}
                  onClick={() => toggleInterest(interest)}
                >
                  {interest}
                </FilterChip>
              ))}
            </div>
          </div>

          {/* Pace */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Trip pace</h3>
            <SegmentedToggle
              options={PACE_OPTIONS}
              value={pace}
              onChange={setPace}
            />
          </div>

          {/* Budget */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Budget level</h3>
            <SegmentedToggle
              options={BUDGET_OPTIONS}
              value={budget}
              onChange={setBudget}
            />
          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <StickyFooter
        summary={
          selectedInterests.length > 0 ? (
            <span className="text-sm text-muted-foreground">
              {selectedInterests.length} interests · {pace} · {budget}
            </span>
          ) : undefined
        }
        action={
          <Button
            size="pill"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? "Saving..." : "Next"}
          </Button>
        }
      />
    </div>
  );
}
