import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Plus, Trash2, X, Loader2, Image as ImageIcon } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TripPhotoGalleryProps {
  tripId: number;
  startDate: string;
  endDate: string;
  isOwner: boolean;
}

function getDayCount(startDate: string, endDate: string): number {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T23:59:59");
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
}

export function TripPhotoGallery({ tripId, startDate, endDate, isOwner }: TripPhotoGalleryProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [uploadingDay, setUploadingDay] = useState<number | null>(null);

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ["/api/trips", tripId, "photos"],
    queryFn: () => api.tripPhotos.list(tripId),
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, dayNumber }: { file: File; dayNumber: number }) => {
      const photoUrl = await api.upload.image(file);
      return api.tripPhotos.create(tripId, { photoUrl, dayNumber });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "photos"] });
      toast.success("Photo added");
      setUploadingDay(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setUploadingDay(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (photoId: number) => api.tripPhotos.remove(tripId, photoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips", tripId, "photos"] });
      setSelectedPhoto(null);
      toast("Photo removed");
    },
  });

  const handleAddPhoto = (dayNumber: number) => {
    setUploadingDay(dayNumber);
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingDay !== null) {
      uploadMutation.mutate({ file, dayNumber: uploadingDay });
    }
    if (e.target) e.target.value = "";
  };

  const dayCount = getDayCount(startDate, endDate);
  const photosByDay = new Map<number, any[]>();
  photos.forEach((photo: any) => {
    const day = photo.dayNumber || 1;
    if (!photosByDay.has(day)) photosByDay.set(day, []);
    photosByDay.get(day)!.push(photo);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (photos.length === 0 && !isOwner) {
    return null;
  }

  return (
    <div className="mt-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-display font-bold text-charcoal flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          Trip Photos
        </h3>
        <span className="text-sm text-muted-foreground">
          {photos.length} photo{photos.length !== 1 ? "s" : ""}
        </span>
      </div>

      {photos.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
          <ImageIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-3">
            No photos yet. Capture memories from your trip!
          </p>
          {isOwner && (
            <button
              onClick={() => handleAddPhoto(1)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Photo
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {Array.from({ length: dayCount }, (_, i) => i + 1).map((day) => {
            const dayPhotos = photosByDay.get(day) || [];
            if (dayPhotos.length === 0 && !isOwner) return null;

            return (
              <div key={day}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Day {day}
                  </p>
                  {isOwner && (
                    <button
                      onClick={() => handleAddPhoto(day)}
                      disabled={uploadMutation.isPending}
                      className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </button>
                  )}
                </div>

                {dayPhotos.length > 0 ? (
                  <div className="grid grid-cols-3 gap-1.5 rounded-xl overflow-hidden">
                    {dayPhotos.map((photo: any) => (
                      <motion.button
                        key={photo.id}
                        layoutId={`photo-${photo.id}`}
                        onClick={() => setSelectedPhoto(photo)}
                        className="relative aspect-square overflow-hidden bg-gray-100"
                      >
                        <img
                          src={photo.photoUrl}
                          alt={photo.caption || "Trip photo"}
                          className="h-full w-full object-cover"
                        />
                      </motion.button>
                    ))}
                    {uploadMutation.isPending && uploadingDay === day && (
                      <div className="aspect-square bg-gray-100 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ) : (
                  isOwner && (
                    <div className="border border-dashed border-gray-200 rounded-lg p-4 text-center">
                      <p className="text-xs text-muted-foreground">No photos for this day</p>
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 p-2 text-white/80 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>

            {isOwner && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteMutation.mutate(selectedPhoto.id);
                }}
                className="absolute top-4 left-4 p-2 text-white/80 hover:text-red-400"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}

            <motion.img
              layoutId={`photo-${selectedPhoto.id}`}
              src={selectedPhoto.photoUrl}
              alt={selectedPhoto.caption || "Trip photo"}
              className="max-h-[85vh] max-w-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />

            {selectedPhoto.caption && (
              <div className="absolute bottom-8 left-4 right-4 text-center">
                <p className="text-white text-sm bg-black/50 rounded-lg px-4 py-2 inline-block">
                  {selectedPhoto.caption}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
