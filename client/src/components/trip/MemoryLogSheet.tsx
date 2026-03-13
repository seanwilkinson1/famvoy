import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MapPin, Camera, X, Loader2 } from "lucide-react";

const EMOJI_OPTIONS = [
  "\u{1F60D}", "\u{1F929}", "\u{1F60B}", "\u{1F60C}", "\u{1F973}",
  "\u{1F60E}", "\u{1FAF6}", "\u{1F62E}", "\u{1F914}", "\u{1F602}",
];

const TAG_OPTIONS = [
  { value: "milestone", label: "Milestone" },
  { value: "food", label: "Food" },
  { value: "scenery", label: "Scenery" },
  { value: "culture", label: "Culture" },
  { value: "family", label: "Family" },
  { value: "history", label: "History" },
];

interface MemoryLogSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: number;
  dayNumber: number;
  stopName?: string;
  tripStopId?: number;
}

export function MemoryLogSheet({
  open,
  onOpenChange,
  tripId,
  dayNumber,
  stopName,
  tripStopId,
}: MemoryLogSheetProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [emoji, setEmoji] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [tag, setTag] = useState<string>("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const createMutation = useMutation({
    mutationFn: async () => {
      let photos: string[] | null = null;

      // Upload photo if one is selected
      if (photoFile) {
        setUploadProgress(0);
        const photoUrl = await api.upload.image(photoFile, setUploadProgress);
        photos = [photoUrl];
        setUploadProgress(null);
      }

      return api.tripMemories.create(tripId, {
        dayNumber,
        tripStopId: tripStopId || null,
        emoji: emoji || null,
        caption: caption || null,
        photos,
        tag: tag || null,
        isHighlight: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tripMemories", tripId] });
      queryClient.invalidateQueries({ queryKey: ["tripLive", tripId] });
      resetAndClose();
    },
  });

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  };

  const removePhoto = () => {
    setPhotoFile(null);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const resetAndClose = () => {
    setEmoji("");
    setCaption("");
    setTag("");
    removePhoto();
    setUploadProgress(null);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-[#0D1117] border-white/10 rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="text-white text-lg font-semibold text-left">
            Log a Memory
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 pt-4 pb-2">
          {/* Stop context */}
          {stopName && (
            <div className="flex items-center gap-2 text-white/50 text-sm">
              <MapPin className="w-4 h-4" />
              <span>At: {stopName}</span>
            </div>
          )}

          {/* Photo upload */}
          <div>
            <label className="text-white/60 text-xs font-medium uppercase tracking-wider block mb-2">
              Photo
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoSelect}
              className="hidden"
            />
            {photoPreview ? (
              <div className="relative inline-block">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="h-24 w-24 rounded-xl object-cover"
                />
                <button
                  onClick={removePhoto}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 border-dashed rounded-xl text-white/40 hover:text-white/60 hover:bg-white/8 transition-colors text-sm"
              >
                <Camera className="w-4 h-4" />
                Add a photo
              </button>
            )}
          </div>

          {/* Emoji mood picker */}
          <div>
            <label className="text-white/60 text-xs font-medium uppercase tracking-wider block mb-2">
              How are you feeling?
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(emoji === e ? "" : e)}
                  className={`text-2xl w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    emoji === e
                      ? "bg-white/15 ring-2 ring-white/30 scale-110"
                      : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Caption */}
          <div>
            <label className="text-white/60 text-xs font-medium uppercase tracking-wider block mb-2">
              Caption
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, 500))}
              placeholder="What happened?"
              rows={3}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none text-sm"
            />
            <p className="text-white/30 text-xs text-right mt-1">{caption.length}/500</p>
          </div>

          {/* Tag selector */}
          <div>
            <label className="text-white/60 text-xs font-medium uppercase tracking-wider block mb-2">
              Tag
            </label>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTag(tag === t.value ? "" : t.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    tag === t.value
                      ? "bg-white/15 border-white/30 text-white"
                      : "bg-white/5 border-white/10 text-white/50 hover:text-white/70"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Save button */}
          <Button
            size="pill"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || (!caption && !emoji && !photoFile)}
            className="w-full bg-white text-[#0D1117] hover:bg-white/90"
          >
            {uploadProgress !== null ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                Uploading {uploadProgress}%
              </>
            ) : createMutation.isPending ? (
              "Saving..."
            ) : (
              "Save Memory"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
