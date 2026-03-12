import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ProgressRing } from "@/components/ui/progress-ring";
import { StickyFooter } from "@/components/ui/sticky-footer";
import { StepperControl } from "@/components/ui/stepper-control";
import { Button } from "@/components/ui/button";

export default function TripSetup() {
  const [, setLocation] = useLocation();

  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [adults, setAdults] = useState(2);
  const [kids, setKids] = useState(0);

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: api.users.getMe,
  });

  const { data: pods } = useQuery({
    queryKey: ["myPods", currentUser?.id],
    queryFn: () => api.users.getPods(currentUser!.id),
    enabled: !!currentUser?.id,
  });

  const [selectedPodId, setSelectedPodId] = useState<number | undefined>();

  const createMutation = useMutation({
    mutationFn: async () => {
      const trip = await api.trips.create({
        name,
        destination,
        startDate,
        endDate,
        podId: selectedPodId,
        adultsCount: adults,
        kidsCount: kids,
      });
      return trip;
    },
    onSuccess: (trip) => {
      setLocation(`/trips/new/style?tripId=${trip.id}`);
    },
  });

  const canProceed = name.trim() && destination.trim() && startDate && endDate;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-4">
        <button onClick={() => setLocation("/trips")} className="p-2 -ml-2 text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <ProgressRing current={1} total={5} size={40} strokeWidth={3} />
        <button onClick={() => setLocation("/trips")} className="text-sm text-muted-foreground font-medium">
          Cancel
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pb-32">
        <h1 className="font-heading text-3xl font-semibold text-foreground text-center mt-4 mb-2">
          Where are you headed?
        </h1>
        <p className="text-muted-foreground text-center mb-8">
          Tell us about your trip
        </p>

        <div className="space-y-5 max-w-md mx-auto">
          {/* Trip name */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Trip name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Summer in Barcelona"
              className="w-full h-12 px-4 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>

          {/* Destination */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Destination</label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Barcelona, Spain"
              className="w-full h-12 px-4 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-12 px-4 bg-card border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">End date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full h-12 px-4 bg-card border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>
          </div>

          {/* Travelers */}
          <div className="pt-2 space-y-3">
            <h3 className="text-sm font-medium text-foreground">Travelers</h3>
            <StepperControl label="Adults" value={adults} min={1} max={10} onChange={setAdults} />
            <StepperControl label="Kids" value={kids} min={0} max={10} onChange={setKids} />
          </div>

          {/* Pod selector */}
          {pods && pods.length > 0 && (
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Link to a pod (optional)</label>
              <select
                value={selectedPodId || ""}
                onChange={(e) => setSelectedPodId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full h-12 px-4 bg-card border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              >
                <option value="">No pod</option>
                {pods.map((pod: any) => (
                  <option key={pod.id} value={pod.id}>{pod.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Sticky footer */}
      <StickyFooter
        summary={
          destination ? (
            <span className="text-sm text-muted-foreground">
              {destination} · {adults + kids} travelers
            </span>
          ) : undefined
        }
        action={
          <Button
            size="pill"
            disabled={!canProceed || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? "Creating..." : "Next"}
          </Button>
        }
      />
    </div>
  );
}
