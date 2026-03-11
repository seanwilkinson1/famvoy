import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Sparkles, MapPin, Loader2, Plus, Calendar, DollarSign } from "lucide-react";

interface AISuggestionsProps {
  onSaveDream: (data: { destinationName: string; tags?: string[] }) => void;
}

export function AISuggestions({ onSaveDream }: AISuggestionsProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [when, setWhen] = useState("");
  const [budget, setBudget] = useState("");
  const [tripStyle, setTripStyle] = useState("");

  const suggestMutation = useMutation({
    mutationFn: () => api.dreams.suggest({ when, budget, tripStyle }),
  });

  const STYLES = ["beach", "city", "adventure", "nature", "cultural", "road-trip"];

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl border border-purple-200 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-5 w-5 text-purple-600" />
        <h3 className="font-display font-bold text-foreground">AI Trip Ideas</h3>
      </div>

      {!suggestMutation.data && !suggestMutation.isPending && (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            Get personalized destination recommendations based on your family.
          </p>

          {showFilters && (
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs font-medium text-foreground">When?</label>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {["spring", "summer", "fall", "winter", "anytime"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setWhen(when === s ? "" : s)}
                      className={`text-xs px-3 py-1 rounded-full border ${
                        when === s
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-white text-muted-foreground border-border"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Budget</label>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {["budget", "moderate", "luxury"].map((b) => (
                    <button
                      key={b}
                      onClick={() => setBudget(budget === b ? "" : b)}
                      className={`text-xs px-3 py-1 rounded-full border ${
                        budget === b
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-white text-muted-foreground border-border"
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Trip Style</label>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {STYLES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setTripStyle(tripStyle === s ? "" : s)}
                      className={`text-xs px-3 py-1 rounded-full border ${
                        tripStyle === s
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-white text-muted-foreground border-border"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={() => suggestMutation.mutate()}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Suggest Destinations
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="text-purple-600 border-purple-200"
            >
              {showFilters ? "Hide" : "Filters"}
            </Button>
          </div>
        </>
      )}

      {suggestMutation.isPending && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-purple-600 mr-2" />
          <span className="text-sm text-muted-foreground">Dreaming up ideas...</span>
        </div>
      )}

      {suggestMutation.data && (
        <div className="space-y-3">
          {suggestMutation.data.map((s: any, i: number) => (
            <div key={i} className="bg-white rounded-xl border p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-display font-bold text-foreground flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-purple-600" />
                    {s.destinationName}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">{s.why}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {s.bestTime}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" /> {s.estimatedBudget}
                    </span>
                  </div>
                  {s.sampleActivities && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {s.sampleActivities.join(" · ")}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    onSaveDream({
                      destinationName: s.destinationName,
                      tags: s.tags,
                    })
                  }
                  className="text-purple-600 hover:text-purple-700"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            onClick={() => suggestMutation.reset()}
            className="w-full text-purple-600 border-purple-200"
          >
            Get New Suggestions
          </Button>
        </div>
      )}
    </div>
  );
}
