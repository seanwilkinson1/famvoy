import { useState } from "react";
import { ChevronLeft, Camera, MapPin, Clock, Info } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function Create() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: api.users.getMe,
  });

  const [formData, setFormData] = useState({
    title: "",
    cost: "Free" as "Free" | "$" | "$$",
    duration: "",
    ages: "",
    locationName: "",
    category: "Outdoor",
    description: "",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser) throw new Error("No user logged in");
      
      return api.experiences.create({
        ...formData,
        image: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800",
        locationLat: 37.7749,
        locationLng: -122.4194,
        userId: currentUser.id,
        tips: [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["experiences"] });
      toast({
        title: "Experience Saved!",
        description: "Your experience has been created successfully.",
        duration: 3000,
      });
      setTimeout(() => setLocation("/"), 1000);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create experience",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!formData.title || !formData.duration) {
      toast({
        title: "Missing Fields",
        description: "Please fill in at least the title and duration",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background pt-14 pb-32 px-6">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <button 
          onClick={() => setLocation("/")} 
          className="rounded-full bg-gray-100 p-2 active:scale-90"
          data-testid="button-back"
        >
          <ChevronLeft className="h-6 w-6 text-gray-700" />
        </button>
        <h1 className="font-heading text-2xl font-bold text-gray-900">New Experience</h1>
      </div>

      <div className="space-y-8">
        {/* Step 1: Photo */}
        <section>
          <label className="mb-2 block text-sm font-bold text-gray-700">Photos</label>
          <div className="relative aspect-video w-full overflow-hidden rounded-3xl bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center group cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center shadow-sm mb-3 group-active:scale-90 transition-transform">
              <Camera className="h-8 w-8 text-primary" />
            </div>
            <p className="text-sm font-medium text-gray-500">Add a photo (placeholder)</p>
          </div>
        </section>

        {/* Step 2: Details */}
        <section className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-bold text-gray-700">Title</label>
            <input
              type="text"
              placeholder="e.g., Hidden Creek Hike"
              className="w-full rounded-xl border border-gray-200 bg-white p-4 text-base font-medium placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              data-testid="input-title"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">Duration</label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="1.5 hrs"
                  className="w-full rounded-xl border border-gray-200 bg-white py-4 pl-12 pr-4 text-base font-medium placeholder:text-gray-400 focus:border-primary focus:outline-none"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  data-testid="input-duration"
                />
              </div>
             </div>
             <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">Ages</label>
              <div className="relative">
                <Info className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="3-7"
                  className="w-full rounded-xl border border-gray-200 bg-white py-4 pl-12 pr-4 text-base font-medium placeholder:text-gray-400 focus:border-primary focus:outline-none"
                  value={formData.ages}
                  onChange={(e) => setFormData({ ...formData, ages: e.target.value })}
                  data-testid="input-ages"
                />
              </div>
             </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-gray-700">Cost</label>
            <div className="flex rounded-xl bg-gray-100 p-1">
              {(["Free", "$", "$$"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setFormData({ ...formData, cost: c })}
                  className={cn(
                    "flex-1 rounded-lg py-2 text-sm font-bold transition-all",
                    formData.cost === c
                      ? "bg-white text-primary shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                  data-testid={`button-cost-${c.toLowerCase()}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          
          <div>
             <label className="mb-2 block text-sm font-bold text-gray-700">Location</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Add location"
                  className="w-full rounded-xl border border-gray-200 bg-white py-4 pl-12 pr-4 text-base font-medium placeholder:text-gray-400 focus:border-primary focus:outline-none"
                  value={formData.locationName}
                  onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                  data-testid="input-location"
                />
              </div>
          </div>

           <div>
            <label className="mb-2 block text-sm font-bold text-gray-700">What did you love?</label>
            <textarea
              rows={3}
              placeholder="Share your experience..."
              className="w-full rounded-xl border border-gray-200 bg-white p-4 text-base font-medium placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              data-testid="input-description"
            />
          </div>
        </section>

        {/* Sticky Save */}
        <button
          onClick={handleSave}
          disabled={createMutation.isPending}
          className="w-full rounded-2xl bg-primary py-4 text-lg font-bold text-white shadow-lg shadow-primary/30 active:scale-[0.98] transition-transform disabled:opacity-50"
          data-testid="button-save-experience"
        >
          {createMutation.isPending ? "Saving..." : "Save Experience"}
        </button>
      </div>
    </div>
  );
}
