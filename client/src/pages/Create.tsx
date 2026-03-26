import { useState, useRef, useCallback, useEffect } from "react";
import { ChevronLeft, Camera, Clock, Info, X, Loader2, MapPin, TreePine, UtensilsCrossed, Sparkles, Bed, Gem, Lightbulb, Eye } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { GooglePlacesAutocomplete } from "@/components/shared/GooglePlacesAutocomplete";
import { GoogleMapsProvider } from "@/components/shared/GoogleMapsProvider";
import { motion, AnimatePresence, Reorder } from "framer-motion";

// ─── Types ──────────────────────────────────────────────────────
interface WizardFormData {
  images: string[];
  title: string;
  locationName: string;
  locationLat: number | null;
  locationLng: number | null;
  category: string;
  description: string;
  tip: string;
  ages: string;
  cost: "Free" | "$" | "$$";
  duration: string;
}

const EMPTY_FORM: WizardFormData = {
  images: [],
  title: "",
  locationName: "",
  locationLat: null,
  locationLng: null,
  category: "",
  description: "",
  tip: "",
  ages: "",
  cost: "Free",
  duration: "",
};

const CATEGORIES = [
  { value: "Outdoor", label: "Outdoor", icon: TreePine },
  { value: "Restaurant", label: "Restaurant", icon: UtensilsCrossed },
  { value: "Activity", label: "Activity", icon: Sparkles },
  { value: "Accommodation", label: "Stay", icon: Bed },
  { value: "Hidden Gem", label: "Hidden Gem", icon: Gem },
] as const;

const DRAFT_KEY = "famvoy-draft-experience";
const DRAFT_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
const INTERSTITIAL_SEEN_KEY = "famvoy-create-interstitial-seen";
const TIPS_DISMISSED_KEY = "famvoy-create-tips-dismissed";

// ─── Draft helpers ──────────────────────────────────────────────
function saveDraft(data: WizardFormData, step: number) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ data, step, savedAt: Date.now() }));
  } catch {}
}

function loadDraft(): { data: WizardFormData; step: number } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.savedAt > DRAFT_MAX_AGE) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return { data: parsed.data, step: parsed.step };
  } catch {
    return null;
  }
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

// ─── Step 1: Photos ─────────────────────────────────────────────
function StepPhotos({
  images,
  onImagesChange,
}: {
  images: string[];
  onImagesChange: (images: string[]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCount, setUploadingCount] = useState(0);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const remaining = 6 - images.length;
    const toUpload = files.slice(0, remaining);

    setUploadingCount(toUpload.length);
    try {
      const urls = await Promise.all(
        toUpload.map((file) => api.upload.image(file, () => {}))
      );
      onImagesChange([...images, ...urls]);
    } catch (error: any) {
      toast.error("Upload failed", { description: error.message || "Could not upload photos." });
    } finally {
      setUploadingCount(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground mb-1">Add Photos</h2>
        <p className="text-sm text-muted-foreground">Show the place, not just faces. Bright, clear shots work best.</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleUpload}
      />

      <Reorder.Group
        axis="x"
        values={images}
        onReorder={onImagesChange}
        className="flex gap-3 flex-wrap"
      >
        {images.map((url, index) => (
          <Reorder.Item key={url} value={url}>
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden group cursor-grab active:cursor-grabbing">
              <img src={url} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
              {index === 0 && (
                <span className="absolute bottom-1 left-1 text-[10px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded-full">
                  Cover
                </span>
              )}
              <button
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      {images.length < 6 && (
        <button
          onClick={() => !uploadingCount && fileInputRef.current?.click()}
          disabled={uploadingCount > 0}
          className={cn(
            "w-full aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center transition-colors",
            images.length > 0 ? "h-32" : "h-48",
            "border-gray-300 bg-muted hover:bg-muted/80"
          )}
        >
          {uploadingCount > 0 ? (
            <>
              <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
              <p className="text-sm font-medium text-muted-foreground">
                Uploading {uploadingCount} photo{uploadingCount > 1 ? "s" : ""}...
              </p>
            </>
          ) : (
            <>
              <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center shadow-sm mb-2">
                <Camera className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                {images.length === 0 ? "Tap to add photos" : `Add more (${images.length}/6)`}
              </p>
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ─── Step 2: What & Where ───────────────────────────────────────
function StepWhatWhere({
  formData,
  onChange,
  locationSearch,
  setLocationSearch,
}: {
  formData: WizardFormData;
  onChange: (updates: Partial<WizardFormData>) => void;
  locationSearch: string;
  setLocationSearch: (v: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground mb-1">What & Where</h2>
        <p className="text-sm text-muted-foreground">Give it a specific name so families can find it.</p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-bold text-foreground">Title</label>
        <input
          type="text"
          placeholder="Sunset Tacos at El Cielito — worth the wait"
          className="w-full rounded-xl border border-border bg-white p-4 text-base font-medium placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          value={formData.title}
          onChange={(e) => onChange({ title: e.target.value })}
          maxLength={100}
        />
        <p className="text-xs text-muted-foreground mt-1 text-right">{formData.title.length}/100</p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-bold text-foreground">Location</label>
        <GooglePlacesAutocomplete
          value={locationSearch}
          onChange={setLocationSearch}
          onPlaceSelect={(place) => {
            onChange({
              locationName: place.name,
              locationLat: place.lat,
              locationLng: place.lng,
            });
            setLocationSearch(place.name);
          }}
          onClear={() => {
            onChange({ locationName: "", locationLat: null, locationLng: null });
            setLocationSearch("");
          }}
          placeholder="Search for a location..."
          showCurrentLocation={true}
          isSelected={!!formData.locationLat}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-bold text-foreground">Category</label>
        <div className="grid grid-cols-3 gap-3">
          {CATEGORIES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => onChange({ category: value })}
              className={cn(
                "flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all",
                formData.category === value
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-white text-muted-foreground hover:border-primary/30"
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs font-bold">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Details ────────────────────────────────────────────
function StepDetails({
  formData,
  onChange,
}: {
  formData: WizardFormData;
  onChange: (updates: Partial<WizardFormData>) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground mb-1">The Details</h2>
        <p className="text-sm text-muted-foreground">The more specific, the more helpful for other families.</p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-bold text-foreground">What made this special?</label>
        <textarea
          rows={3}
          placeholder="What made this special? Mention specific things your family loved..."
          className="w-full rounded-xl border border-border bg-white p-4 text-base font-medium placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          value={formData.description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </div>

      <div>
        <label className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          Insider Tip
        </label>
        <textarea
          rows={2}
          placeholder="Something you wish you knew before going (e.g., 'Arrive 20 min early for sunset seats on the patio')"
          className="w-full rounded-xl border border-border bg-white p-4 text-base font-medium placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          value={formData.tip}
          onChange={(e) => onChange({ tip: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-2 block text-sm font-bold text-foreground">Duration</label>
          <div className="relative">
            <Clock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="1.5 hrs"
              className="w-full rounded-xl border border-border bg-white py-4 pl-12 pr-4 text-base font-medium placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              value={formData.duration}
              onChange={(e) => onChange({ duration: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold text-foreground">Ages</label>
          <div className="relative">
            <Info className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="e.g., 3-7 or All Ages"
              className="w-full rounded-xl border border-border bg-white py-4 pl-12 pr-4 text-base font-medium placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              value={formData.ages}
              onChange={(e) => onChange({ ages: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-bold text-foreground">Cost</label>
        <div className="flex rounded-xl bg-muted p-1">
          {(["Free", "$", "$$"] as const).map((c) => (
            <button
              key={c}
              onClick={() => onChange({ cost: c })}
              className={cn(
                "flex-1 rounded-lg py-2 text-sm font-bold transition-all",
                formData.cost === c
                  ? "bg-white text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 4: Preview & Share ────────────────────────────────────
function StepPreview({
  formData,
  currentUser,
  isEdit,
}: {
  formData: WizardFormData;
  currentUser: any;
  isEdit: boolean;
}) {
  const heroImage = formData.images[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground mb-1">Preview</h2>
        <p className="text-sm text-muted-foreground">Here's how your recommendation will appear.</p>
      </div>

      {/* Preview card */}
      <div className="rounded-2xl overflow-hidden bg-card border border-border">
        {heroImage && (
          <div className="relative aspect-[4/3]">
            <img src={heroImage} alt={formData.title} className="w-full h-full object-cover" />
            {formData.images.length > 1 && (
              <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-full">
                +{formData.images.length - 1}
              </span>
            )}
          </div>
        )}
        <div className="p-4 space-y-1.5">
          {currentUser?.name && (
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {currentUser.name}
            </p>
          )}
          <h3 className="font-semibold text-[15px] leading-snug text-foreground">
            {formData.title || "Your experience title"}
          </h3>
          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
            {formData.duration && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formData.duration}
              </span>
            )}
            <span className="flex items-center gap-1">
              <span className="text-xs">{formData.cost}</span>
            </span>
            {formData.ages && (
              <span className="flex items-center gap-1">
                <Info className="h-3.5 w-3.5" />
                {formData.ages}
              </span>
            )}
          </div>
          {formData.description && (
            <p className="text-sm text-muted-foreground pt-2 line-clamp-2">{formData.description}</p>
          )}
          {formData.tip && (
            <div className="flex items-start gap-2 mt-2 p-3 bg-amber-50 rounded-xl">
              <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-800">{formData.tip}</p>
            </div>
          )}
        </div>
      </div>

      {/* Visibility info */}
      <div className="flex items-center gap-3 p-4 bg-muted rounded-2xl">
        {currentUser?.avatar ? (
          <img src={currentUser.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Eye className="h-4 w-4 text-primary" />
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-foreground">
            Posting as {currentUser?.name || "You"}
          </p>
          <p className="text-xs text-muted-foreground">
            Your recommendation will help other families discover amazing experiences
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Education Interstitial ─────────────────────────────────────
function EducationInterstitial({ onDismiss }: { onDismiss: () => void }) {
  const [screen, setScreen] = useState(0);

  const screens = [
    {
      title: "Help families find hidden gems",
      description: "Your recommendations help other families plan amazing trips. The more specific you are, the more helpful your post will be.",
      icon: <MapPin className="h-12 w-12 text-primary" />,
    },
    {
      title: "Be specific, be helpful",
      description: "",
      icon: null,
      custom: (
        <div className="space-y-4">
          <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
            <p className="text-xs font-bold text-red-400 mb-1">Instead of this...</p>
            <p className="text-sm text-red-700">"Nice restaurant, good food"</p>
          </div>
          <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
            <p className="text-xs font-bold text-green-500 mb-1">Try this!</p>
            <p className="text-sm text-green-800">"Sunset Tacos at El Cielito — Best fish tacos in Sayulita. Order the grilled mahi with mango salsa. High chairs available, kids menu has plain quesadillas."</p>
          </div>
        </div>
      ),
    },
    {
      title: "What makes a great post",
      description: "",
      icon: null,
      custom: (
        <div className="space-y-3">
          {[
            { icon: Camera, text: "A clear photo of the place" },
            { icon: MapPin, text: "The specific name & location" },
            { icon: Info, text: "Who it's great for (ages, group size)" },
            { icon: Lightbulb, text: "An insider tip others should know" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3 p-3 bg-muted rounded-xl">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">{text}</p>
            </div>
          ))}
        </div>
      ),
    },
  ];

  const handleNext = () => {
    if (screen < screens.length - 1) {
      setScreen(screen + 1);
    } else {
      localStorage.setItem(INTERSTITIAL_SEEN_KEY, "true");
      onDismiss();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pt-14 px-6 pb-8 md:max-w-3xl md:mx-auto">
      <div className="flex justify-end mb-4">
        <button
          onClick={() => {
            localStorage.setItem(INTERSTITIAL_SEEN_KEY, "true");
            onDismiss();
          }}
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Skip
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.2 }}
            className="w-full space-y-6 text-center"
          >
            {screens[screen].icon && (
              <div className="flex justify-center">{screens[screen].icon}</div>
            )}
            <h2 className="font-heading text-2xl font-bold text-foreground">
              {screens[screen].title}
            </h2>
            {screens[screen].description && (
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                {screens[screen].description}
              </p>
            )}
            {(screens[screen] as any).custom}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots + Next */}
      <div className="space-y-4">
        <div className="flex justify-center gap-2">
          {screens.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-2 rounded-full transition-all",
                i === screen ? "w-6 bg-primary" : "w-2 bg-border"
              )}
            />
          ))}
        </div>
        <button
          onClick={handleNext}
          className="w-full rounded-2xl bg-primary py-4 text-lg font-bold text-white shadow-lg shadow-primary/30 active:scale-[0.98] transition-transform"
        >
          {screen === screens.length - 1 ? "Let's Go!" : "Next"}
        </button>
      </div>
    </div>
  );
}

// ─── Tips Banner ────────────────────────────────────────────────
function TipsBanner() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(TIPS_DISMISSED_KEY) === "true"
  );

  if (dismissed) return null;

  return (
    <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-2xl mb-4">
      <Lightbulb className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-800">
          Great experiences are specific — mention names, ages, and insider tips!
        </p>
      </div>
      <button
        onClick={() => {
          setDismissed(true);
          localStorage.setItem(TIPS_DISMISSED_KEY, "true");
        }}
        className="text-amber-400 hover:text-amber-600"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Main Wizard ────────────────────────────────────────────────
function CreateWizardInner() {
  const [, setLocation] = useLocation();
  const [, editParams] = useRoute("/experience/:id/edit");
  const queryClient = useQueryClient();

  const editId = editParams?.id ? parseInt(editParams.id) : null;
  const isEdit = !!editId;

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: api.users.getMe,
  });

  // Load existing experience for edit mode
  const { data: existingExperience } = useQuery({
    queryKey: ["experience", editId],
    queryFn: () => api.experiences.getById(editId!),
    enabled: !!editId,
  });

  // Check if first-time poster
  const { data: userExperiences } = useQuery({
    queryKey: ["experiences", "user", currentUser?.id],
    queryFn: () => currentUser ? api.users.getExperiences(currentUser.id) : [],
    enabled: !!currentUser && !isEdit,
  });

  const isFirstPost = !isEdit && userExperiences?.length === 0;
  const interstitialSeen = localStorage.getItem(INTERSTITIAL_SEEN_KEY) === "true";
  const [showInterstitial, setShowInterstitial] = useState(false);

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<WizardFormData>(EMPTY_FORM);
  const [locationSearch, setLocationSearch] = useState("");
  const [draftChecked, setDraftChecked] = useState(false);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const draftRef = useRef<{ data: WizardFormData; step: number } | null>(null);

  // Check for draft on mount (create mode only)
  useEffect(() => {
    if (isEdit || draftChecked) return;
    const draft = loadDraft();
    if (draft) {
      draftRef.current = draft;
      setShowDraftDialog(true);
    }
    setDraftChecked(true);
  }, [isEdit, draftChecked]);

  // Show interstitial for first-time posters
  useEffect(() => {
    if (isFirstPost && !interstitialSeen && !isEdit) {
      setShowInterstitial(true);
    }
  }, [isFirstPost, interstitialSeen, isEdit]);

  // Pre-populate for edit mode
  useEffect(() => {
    if (existingExperience && isEdit) {
      setFormData({
        images: existingExperience.images?.length
          ? existingExperience.images
          : existingExperience.image
            ? [existingExperience.image]
            : [],
        title: existingExperience.title,
        locationName: existingExperience.locationName,
        locationLat: existingExperience.locationLat,
        locationLng: existingExperience.locationLng,
        category: existingExperience.category,
        description: existingExperience.description || "",
        tip: existingExperience.tip || (existingExperience.tips?.length ? existingExperience.tips[0] : ""),
        ages: existingExperience.ages,
        cost: existingExperience.cost as "Free" | "$" | "$$",
        duration: existingExperience.duration,
      });
      setLocationSearch(existingExperience.locationName);
    }
  }, [existingExperience, isEdit]);

  // Auto-save draft (debounced, create mode only)
  useEffect(() => {
    if (isEdit) return;
    const timer = setTimeout(() => {
      if (formData.images.length > 0 || formData.title) {
        saveDraft(formData, step);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [formData, step, isEdit]);

  const onChange = useCallback((updates: Partial<WizardFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  // Validation per step
  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.images.length >= 1;
      case 2:
        return formData.title.trim().length > 0 && !!formData.locationLat && formData.category.length > 0;
      case 3:
        return true; // all optional
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canProceed()) {
      if (step === 1) toast.error("Add at least one photo to continue");
      if (step === 2) {
        if (!formData.title.trim()) toast.error("Add a title");
        else if (!formData.locationLat) toast.error("Select a location");
        else if (!formData.category) toast.error("Pick a category");
      }
      return;
    }
    if (!isEdit) saveDraft(formData, step + 1);
    setStep((s) => Math.min(s + 1, 4));
  };

  const handleBack = () => {
    if (step === 1) {
      setLocation(isEdit ? `/experience/${editId}` : "/");
    } else {
      setStep((s) => s - 1);
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser) throw new Error("No user logged in");
      const payload = {
        title: formData.title,
        image: formData.images[0],
        images: formData.images,
        duration: formData.duration || "Varies",
        cost: formData.cost,
        ages: formData.ages || "All Ages",
        category: formData.category,
        locationName: formData.locationName,
        locationLat: formData.locationLat,
        locationLng: formData.locationLng,
        description: formData.description || null,
        tip: formData.tip || null,
        tips: formData.tip ? [formData.tip] : [],
        userId: currentUser.id,
      };

      if (isEdit && editId) {
        return api.experiences.update(editId, payload);
      }
      return api.experiences.create(payload);
    },
    onSuccess: (experience) => {
      clearDraft();
      queryClient.invalidateQueries({ queryKey: ["experiences"] });
      queryClient.invalidateQueries({ queryKey: ["experience", editId] });
      toast.success(isEdit ? "Changes saved!" : "Recommendation shared!", {
        description: isEdit ? "Your experience has been updated." : "Your recommendation is now live.",
      });
      const targetId = isEdit ? editId : (experience as any)?.id;
      setTimeout(() => setLocation(targetId ? `/experience/${targetId}` : "/"), 500);
    },
    onError: (error: any) => {
      toast.error("Error", { description: error.message || "Something went wrong" });
    },
  });

  // Draft resume dialog
  if (showDraftDialog && draftRef.current) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="bg-card rounded-3xl p-6 max-w-sm w-full shadow-lg border border-border space-y-4">
          <h2 className="font-heading text-xl font-bold text-foreground">Resume your draft?</h2>
          <p className="text-sm text-muted-foreground">
            You have an unfinished recommendation. Would you like to pick up where you left off?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                clearDraft();
                setShowDraftDialog(false);
              }}
              className="flex-1 rounded-xl border border-border py-3 text-sm font-bold text-foreground"
            >
              Start Fresh
            </button>
            <button
              onClick={() => {
                if (draftRef.current) {
                  setFormData(draftRef.current.data);
                  setStep(draftRef.current.step);
                  if (draftRef.current.data.locationName) {
                    setLocationSearch(draftRef.current.data.locationName);
                  }
                }
                setShowDraftDialog(false);
              }}
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-white"
            >
              Resume
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show interstitial
  if (showInterstitial) {
    return <EducationInterstitial onDismiss={() => setShowInterstitial(false)} />;
  }

  const STEP_LABELS = ["Photos", "What & Where", "Details", "Preview"];

  return (
    <div className="min-h-screen bg-background pt-14 pb-32 px-6 md:max-w-3xl md:mx-auto md:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={handleBack}
          className="rounded-full bg-muted p-2 active:scale-90"
        >
          <ChevronLeft className="h-6 w-6 text-foreground" />
        </button>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          {isEdit ? "Edit Experience" : "New Experience"}
        </h1>
      </div>

      {/* Step dots */}
      <div className="flex items-center gap-2 mb-6">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div
              className={cn(
                "h-1.5 rounded-full flex-1 transition-all",
                i + 1 <= step ? "bg-primary" : "bg-border"
              )}
            />
          </div>
        ))}
      </div>

      {/* Tips banner for returning users */}
      {!isEdit && !isFirstPost && step === 1 && <TipsBanner />}

      {/* Step content — keep all steps mounted to preserve Google Maps state */}
      <div className={step === 1 ? "" : "hidden"}>
        <StepPhotos
          images={formData.images}
          onImagesChange={(images) => onChange({ images })}
        />
      </div>
      <div className={step === 2 ? "" : "hidden"}>
        <StepWhatWhere
          formData={formData}
          onChange={onChange}
          locationSearch={locationSearch}
          setLocationSearch={setLocationSearch}
        />
      </div>
      <div className={step === 3 ? "" : "hidden"}>
        <StepDetails formData={formData} onChange={onChange} />
      </div>
      <div className={step === 4 ? "" : "hidden"}>
        <StepPreview formData={formData} currentUser={currentUser} isEdit={isEdit} />
      </div>

      {/* Bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-background/95 backdrop-blur-sm border-t border-border md:max-w-3xl md:mx-auto">
        {step < 4 ? (
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className={cn(
              "w-full rounded-2xl py-4 text-lg font-bold shadow-lg transition-all active:scale-[0.98]",
              canProceed()
                ? "bg-primary text-white shadow-primary/30"
                : "bg-muted text-muted-foreground"
            )}
          >
            Next
          </button>
        ) : (
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="w-full rounded-2xl bg-primary py-4 text-lg font-bold text-white shadow-lg shadow-primary/30 active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {createMutation.isPending
              ? "Saving..."
              : isEdit
                ? "Save Changes"
                : "Share Recommendation"
            }
          </button>
        )}
      </div>
    </div>
  );
}

export default function Create() {
  return (
    <GoogleMapsProvider>
      <CreateWizardInner />
    </GoogleMapsProvider>
  );
}
