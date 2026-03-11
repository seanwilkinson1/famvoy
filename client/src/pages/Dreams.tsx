import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { DreamCard } from "@/components/dreams/DreamCard";
import { AddDreamSheet } from "@/components/dreams/AddDreamSheet";
import { AISuggestions } from "@/components/dreams/AISuggestions";
import { Plus, Compass, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Dreams() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingDream, setEditingDream] = useState<any>(null);

  const { data: dreams = [], isLoading } = useQuery({
    queryKey: ["/api/dreams"],
    queryFn: () => api.dreams.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof api.dreams.create>[0]) => api.dreams.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/dreams"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.dreams.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/dreams"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.dreams.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/dreams"] }),
  });

  const handleSubmit = (data: { destinationName: string; notes?: string; tags?: string[] }) => {
    if (editingDream) {
      updateMutation.mutate({ id: editingDream.id, data });
    } else {
      createMutation.mutate(data);
    }
    setEditingDream(null);
  };

  const handleEdit = (dream: any) => {
    setEditingDream(dream);
    setSheetOpen(true);
  };

  const handlePlanTrip = (dream: any) => {
    // Navigate to create trip page with destination pre-filled
    setLocation(`/create-trip?destination=${encodeURIComponent(dream.destinationName)}`);
  };

  const handleSaveSuggestion = (data: { destinationName: string; tags?: string[] }) => {
    createMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:max-w-6xl md:mx-auto md:px-8">
      {/* Header */}
      <div className="bg-white border-b px-4 pt-4 pb-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">Dream Board</h1>
              <p className="text-sm text-muted-foreground">Places you want to explore</p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingDream(null);
                setSheetOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
        {/* AI Suggestions */}
        <AISuggestions onSaveDream={handleSaveSuggestion} />

        {/* Dream Grid */}
        {dreams.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {dreams.map((dream: any) => (
              <DreamCard
                key={dream.id}
                dream={dream}
                onDelete={(id) => deleteMutation.mutate(id)}
                onEdit={handleEdit}
                onPlanTrip={handlePlanTrip}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Compass className="h-12 w-12 text-border mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              No dream destinations yet. Add places you'd love to visit!
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setEditingDream(null);
                setSheetOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Your First Dream
            </Button>
          </div>
        )}
      </div>

      <AddDreamSheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setEditingDream(null);
        }}
        onSubmit={handleSubmit}
        editingDream={editingDream}
      />
    </div>
  );
}
