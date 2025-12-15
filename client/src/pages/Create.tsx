import { useState, useRef } from "react";
import { ChevronLeft, Camera, Clock, Info, X, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { GooglePlacesAutocomplete } from "@/components/shared/GooglePlacesAutocomplete";

export default function Create() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    locationLat: null as number | null,
    locationLng: null as number | null,
    category: "Outdoor",
    description: "",
  });

  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [locationSearch, setLocationSearch] = useState("");

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    try {
      const url = await api.upload.image(file, (percent) => setUploadProgress(percent));
      setUploadedImageUrl(url);
      toast({
        title: "Photo uploaded!",
        description: "Your photo has been saved permanently.",
        duration: 2000,
      });
    } catch (error: any) {
      console.error('Failed to upload image:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Could not upload the photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const clearLocation = () => {
    setFormData({
      ...formData,
      locationName: "",
      locationLat: null,
      locationLng: null,
    });
    setLocationSearch("");
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser) throw new Error("No user logged in");
      if (!uploadedImageUrl) throw new Error("Photo required");
      if (!formData.locationLat || !formData.locationLng) throw new Error("Location required");
      
      return api.experiences.create({
        title: formData.title,
        cost: formData.cost,
        duration: formData.duration,
        ages: formData.ages,
        locationName: formData.locationName,
        category: formData.category,
        description: formData.description,
        image: uploadedImageUrl,
        locationLat: formData.locationLat,
        locationLng: formData.locationLng,
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
    if (!formData.title) {
      toast({
        title: "Title Required",
        description: "Please add a title for your experience",
        variant: "destructive",
      });
      return;
    }
    if (!formData.duration) {
      toast({
        title: "Duration Required",
        description: "Please add how long the experience takes",
        variant: "destructive",
      });
      return;
    }
    if (!uploadedImageUrl) {
      toast({
        title: "Photo Required",
        description: "Please add a photo of your experience",
        variant: "destructive",
      });
      return;
    }
    if (!formData.locationLat || !formData.locationLng) {
      toast({
        title: "Location Required",
        description: "Please search and select a location from the suggestions",
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
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleImageUpload}
          />
          <div 
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={cn(
              "relative aspect-video w-full overflow-hidden rounded-3xl border-2 border-dashed flex flex-col items-center justify-center group cursor-pointer transition-colors",
              uploadedImageUrl 
                ? "border-transparent bg-gray-900" 
                : "border-gray-300 bg-gray-100 hover:bg-gray-50"
            )}
          >
            {uploadedImageUrl ? (
              <>
                <img 
                  src={uploadedImageUrl} 
                  alt="Uploaded" 
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="h-12 w-12 rounded-full bg-white/90 flex items-center justify-center">
                    <Camera className="h-6 w-6 text-gray-700" />
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setUploadedImageUrl(null);
                  }}
                  className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : isUploading ? (
              <>
                <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center shadow-sm mb-3 relative">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
                <p className="text-sm font-medium text-gray-500">
                  Uploading... {uploadProgress > 0 && `${uploadProgress}%`}
                </p>
                {uploadProgress > 0 && (
                  <div className="w-32 h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center shadow-sm mb-3 group-active:scale-90 transition-transform">
                  <Camera className="h-8 w-8 text-primary" />
                </div>
                <p className="text-sm font-medium text-gray-500">Tap to add a photo</p>
              </>
            )}
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
            <GooglePlacesAutocomplete
              value={locationSearch}
              onChange={setLocationSearch}
              onPlaceSelect={(place) => {
                setFormData({
                  ...formData,
                  locationName: place.name,
                  locationLat: place.lat,
                  locationLng: place.lng,
                });
              }}
              onClear={clearLocation}
              placeholder="Search for a location..."
              showCurrentLocation={true}
              isSelected={!!formData.locationLat}
            />
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
