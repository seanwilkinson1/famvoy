import { useState, useMemo, useRef } from "react";
import { useUser, useAuth, useClerk } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, ArrowRight, Plus, X, User, Users,
  Instagram, Linkedin, Twitter, Globe, Pencil,
  ChevronDown, Camera,
} from "lucide-react";
import { GooglePlacesAutocomplete } from "@/components/shared/GooglePlacesAutocomplete";
import { GoogleMapsProvider } from "@/components/shared/GoogleMapsProvider";
import { api } from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const INTEREST_TAGS = [
  { label: "Potterheads", emoji: "⚡" },
  { label: "LOTR fans", emoji: "🧙" },
  { label: "Swifties", emoji: "🎤" },
  { label: "Disney obsessed", emoji: "🏰" },
  { label: "Trekkies", emoji: "🖖" },
  { label: "Marvel fans", emoji: "🦸" },
  { label: "Gamers", emoji: "🎮" },
  { label: "Bookworms", emoji: "📚" },
  { label: "Movie buffs", emoji: "🎬" },
  { label: "Podcast people", emoji: "🎙️" },
  { label: "Music lovers", emoji: "🎵" },
  { label: "Electronic music", emoji: "🎧" },
  { label: "Jazz lovers", emoji: "🎷" },
  { label: "True crime fans", emoji: "🔍" },
  { label: "Foodies", emoji: "🍕" },
  { label: "Home chefs", emoji: "👨‍🍳" },
  { label: "Coffee snobs", emoji: "☕" },
  { label: "Wine enthusiasts", emoji: "🍷" },
  { label: "Craft beer crew", emoji: "🍺" },
  { label: "Surfers", emoji: "🏄" },
  { label: "Skiers", emoji: "⛷️" },
  { label: "Snowboarders", emoji: "🏂" },
  { label: "Hikers", emoji: "🥾" },
  { label: "Campers", emoji: "🏕️" },
  { label: "Rock climbers", emoji: "🧗" },
  { label: "Pickleball fam", emoji: "🏓" },
  { label: "Runners", emoji: "🏃" },
  { label: "Cyclists", emoji: "🚴" },
  { label: "Peloton", emoji: "🚲" },
  { label: "Horseback riding", emoji: "🐴" },
  { label: "Swimmers", emoji: "🏊" },
  { label: "Martial arts", emoji: "🥋" },
  { label: "Yoga family", emoji: "🧘" },
  { label: "CrossFit", emoji: "🏋️" },
  { label: "Sports fans", emoji: "📺" },
  { label: "Soccer family", emoji: "⚽" },
  { label: "Baseball family", emoji: "⚾" },
  { label: "Basketball family", emoji: "🏀" },
  { label: "Golf family", emoji: "⛳" },
  { label: "Tennis family", emoji: "🎾" },
  { label: "National Parks collectors", emoji: "🏞️" },
  { label: "Passport stampers", emoji: "🛂" },
  { label: "Beach family", emoji: "🏖️" },
  { label: "Mountain family", emoji: "🏔️" },
  { label: "Road trippers", emoji: "🚗" },
  { label: "Van life curious", emoji: "🚐" },
  { label: "Backpackers", emoji: "🎒" },
  { label: "Luxury travelers", emoji: "✨" },
  { label: "Budget travelers", emoji: "💰" },
  { label: "Solo travel", emoji: "🧳" },
  { label: "Faith-based travelers", emoji: "🙏" },
  { label: "Military family", emoji: "🎖️" },
  { label: "Expat family", emoji: "🌍" },
  { label: "Homeschoolers", emoji: "🏠" },
  { label: "Entrepreneurs", emoji: "🚀" },
  { label: "Remote workers", emoji: "💻" },
  { label: "Engineers", emoji: "⚙️" },
  { label: "Scientists", emoji: "🔬" },
  { label: "Artists", emoji: "🎨" },
  { label: "Writers", emoji: "✍️" },
  { label: "Photographers", emoji: "📷" },
  { label: "Crafters", emoji: "🧵" },
  { label: "Makers", emoji: "🔧" },
  { label: "Woodworkers", emoji: "🪵" },
  { label: "Home renovators", emoji: "🔨" },
  { label: "Gardeners", emoji: "🌱" },
  { label: "Plant parents", emoji: "🪴" },
  { label: "Animal lovers", emoji: "🐾" },
  { label: "Dog people", emoji: "🐕" },
  { label: "Cat people", emoji: "🐈" },
  { label: "Horse people", emoji: "🐎" },
  { label: "Farm life", emoji: "🌾" },
  { label: "Volunteers", emoji: "🤝" },
  { label: "Environmentalists", emoji: "♻️" },
  { label: "Minimalists", emoji: "🪷" },
  { label: "Preppers", emoji: "🏗️" },
  { label: "Crypto curious", emoji: "🪙" },
  { label: "AI enthusiasts", emoji: "🤖" },
  { label: "Tech geeks", emoji: "🖥️" },
  { label: "Vintage collectors", emoji: "🕰️" },
  { label: "Thrifters", emoji: "🛍️" },
  { label: "Fashion forward", emoji: "👗" },
  { label: "Dancers", emoji: "💃" },
  { label: "Theater kids", emoji: "🎭" },
  { label: "Choir family", emoji: "🎶" },
  { label: "Magicians", emoji: "🪄" },
  { label: "Comedians", emoji: "😂" },
  { label: "Astronomers", emoji: "🔭" },
  { label: "Birders", emoji: "🐦" },
  { label: "Fishermen", emoji: "🎣" },
  { label: "Hunters", emoji: "🦌" },
  { label: "Paddle boarding", emoji: "🏄‍♀️" },
  { label: "Kayakers", emoji: "🛶" },
  { label: "Empty nesters", emoji: "🪺" },
  { label: "Differently abled", emoji: "♿" },
  { label: "Neurodivergent family", emoji: "🧠" },
];

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getBubbleSize(label: string): "sm" | "md" | "lg" {
  if (label.length <= 8) return "sm";
  if (label.length <= 15) return "md";
  return "lg";
}

type StepKey = "name" | "household" | "crew" | "location" | "about" | "interests" | "photos" | "bio";

function ProgressBar({ steps, currentIndex }: { steps: StepKey[]; currentIndex: number }) {
  return (
    <div className="flex gap-1.5 px-6 py-2">
      {steps.map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1 flex-1 rounded-full transition-colors duration-300",
            i < currentIndex
              ? "bg-foreground"
              : i === currentIndex
                ? "bg-foreground/50"
                : "bg-border"
          )}
        />
      ))}
    </div>
  );
}

function PhotoGrid({
  photos,
  onUpload,
  onEditCaption,
}: {
  photos: { url: string; caption: string }[];
  onUpload: (file: File, slotIndex: number) => void;
  onEditCaption: (index: number) => void;
}) {
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const slots = 6;

  const handleSlotClick = (index: number) => {
    if (photos[index]) {
      onEditCaption(index);
    } else {
      fileInputRefs.current[index]?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file, index);
      e.target.value = "";
    }
  };

  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-2 max-w-xs mx-auto aspect-square">
      {Array.from({ length: slots }).map((_, i) => {
        const photo = photos[i];
        const isHero = i === 0;
        return (
          <button
            key={i}
            type="button"
            onClick={() => handleSlotClick(i)}
            className={cn(
              "relative rounded-2xl overflow-hidden border-2 transition-colors",
              isHero && "col-span-2 row-span-2",
              photo ? "border-transparent" : "border-dashed border-border hover:border-foreground/30"
            )}
          >
            {photo ? (
              <>
                <img src={photo.url} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
                  <Pencil className="w-5 h-5 text-white opacity-0 hover:opacity-100 transition-opacity" />
                </div>
                {photo.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
                    <p className="text-white text-xs truncate">{photo.caption}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                <Plus className="w-6 h-6" />
              </div>
            )}
            <input
              ref={(el) => { fileInputRefs.current[i] = el; }}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e, i)}
            />
          </button>
        );
      })}
    </div>
  );
}

const BIO_HINTS = [
  "What you do for fun on weekends",
  "Your favorite family traditions",
  "Travel styles and dream destinations",
  "What makes your household unique",
  "Your go-to dinner party dish",
];

function OnboardingInner() {
  const { user: clerkUser } = useUser();
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const queryClient = useQueryClient();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showBioHints, setShowBioHints] = useState(false);
  const [captionEditIndex, setCaptionEditIndex] = useState<number | null>(null);
  const [captionDraft, setCaptionDraft] = useState("");
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: clerkUser?.fullName || "",
    location: "",
    interests: [] as string[],
    bio: "",
    householdType: "" as "" | "solo" | "household",
    profession: "",
    company: "",
    instagramHandle: "",
    linkedinUrl: "",
    twitterHandle: "",
    personalUrl: "",
  });

  const [familyMembers, setFamilyMembers] = useState<{ name: string; age: string }[]>([]);
  const [customTags, setCustomTags] = useState<{ label: string; emoji: string }[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [profilePhotos, setProfilePhotos] = useState<{ url: string; caption: string }[]>([]);

  const shuffledTags = useMemo(() => shuffleArray(INTEREST_TAGS), []);

  const steps = useMemo<StepKey[]>(() => {
    const allSteps: StepKey[] = ["name", "household", "crew", "location", "about", "interests", "photos", "bio"];
    if (formData.householdType === "solo") {
      return allSteps.filter(s => s !== "crew");
    }
    return allSteps;
  }, [formData.householdType]);

  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;

  const onboardingMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const res = await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          location: formData.location,
          kids: familyMembers.length > 0
            ? familyMembers.map(m => `${m.name} (${m.age})`).join(", ")
            : "Not specified",
          interests: formData.interests,
          bio: formData.bio || null,
          avatar: profilePhotos[0]?.url || clerkUser?.imageUrl || null,
          profession: formData.profession || null,
          company: formData.company || null,
          instagramHandle: formData.instagramHandle || null,
          linkedinUrl: formData.linkedinUrl || null,
          twitterHandle: formData.twitterHandle || null,
          personalUrl: formData.personalUrl || null,
          householdType: formData.householdType || null,
          profilePhotos: profilePhotos.map((p, i) => ({
            url: p.url,
            caption: p.caption || null,
          })),
        }),
      });
      if (!res.ok) throw new Error('Failed to complete onboarding');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const toggleInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const addFamilyMember = () => {
    setFamilyMembers(prev => [...prev, { name: "", age: "" }]);
  };

  const removeFamilyMember = (index: number) => {
    setFamilyMembers(prev => prev.filter((_, i) => i !== index));
  };

  const updateFamilyMember = (index: number, field: "name" | "age", value: string) => {
    setFamilyMembers(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case "name": return formData.name.length > 0;
      case "household": return formData.householdType !== "";
      case "crew": return true;
      case "location": return formData.location.length > 0;
      case "about": return true;
      case "interests": return formData.interests.length >= 3;
      case "photos": return profilePhotos.length >= 3;
      case "bio": return true;
      default: return true;
    }
  };

  const handleNext = () => {
    if (isLastStep) {
      onboardingMutation.mutate();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handlePhotoUpload = async (file: File, slotIndex: number) => {
    setUploadingSlot(slotIndex);
    try {
      const url = await api.upload.image(file);
      setProfilePhotos(prev => {
        const next = [...prev];
        // Fill the slot — if it's beyond current length, pad with empty
        while (next.length <= slotIndex) {
          next.push({ url: "", caption: "" });
        }
        next[slotIndex] = { url, caption: next[slotIndex]?.caption || "" };
        // Remove any empty placeholders
        return next.filter(p => p.url);
      });
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleEditCaption = (index: number) => {
    setCaptionDraft(profilePhotos[index]?.caption || "");
    setCaptionEditIndex(index);
  };

  const saveCaption = () => {
    if (captionEditIndex !== null) {
      setProfilePhotos(prev =>
        prev.map((p, i) => i === captionEditIndex ? { ...p, caption: captionDraft } : p)
      );
      setCaptionEditIndex(null);
      setCaptionDraft("");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header: ← | "Create profile" | X */}
      <div className="flex items-center justify-between px-4 pt-14 md:pt-6 pb-2">
        {currentStepIndex > 0 ? (
          <button
            onClick={handleBack}
            className="p-2 -ml-2 text-foreground hover:text-foreground/70 transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-9" />
        )}
        <span className="text-sm font-medium text-foreground">Create profile</span>
        <button
          onClick={() => setShowExitDialog(true)}
          className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Progress bar */}
      <ProgressBar steps={steps} currentIndex={currentStepIndex} />

      {/* Step content */}
      <div className="flex-1 flex flex-col justify-center px-6 max-w-md mx-auto w-full">
        {/* Step: Name */}
        {currentStep === "name" && (
          <div className="space-y-8">
            <h1 className="font-heading text-3xl font-medium text-foreground text-center leading-tight">
              What is your name?
            </h1>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full text-center text-2xl font-medium text-foreground bg-transparent border-b-2 border-border focus:border-foreground outline-none pb-3 transition-colors"
              placeholder="The Wilkinsons"
              autoFocus
              data-testid="input-family-name"
            />
          </div>
        )}

        {/* Step: Household type */}
        {currentStep === "household" && (
          <div className="space-y-8">
            <h1 className="font-heading text-3xl font-medium text-foreground text-center leading-tight">
              Tell us about your household
            </h1>
            <div className="space-y-3">
              <button
                onClick={() => setFormData(prev => ({ ...prev, householdType: "solo" }))}
                className={cn(
                  "w-full flex items-center gap-4 px-6 py-5 rounded-2xl border-2 transition-all text-left",
                  formData.householdType === "solo"
                    ? "border-foreground bg-foreground/5"
                    : "border-border hover:border-foreground/30"
                )}
              >
                <User className="w-6 h-6 flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">I live by myself</p>
                  <p className="text-sm text-muted-foreground">Solo adventurer</p>
                </div>
              </button>
              <button
                onClick={() => setFormData(prev => ({ ...prev, householdType: "household" }))}
                className={cn(
                  "w-full flex items-center gap-4 px-6 py-5 rounded-2xl border-2 transition-all text-left",
                  formData.householdType === "household"
                    ? "border-foreground bg-foreground/5"
                    : "border-border hover:border-foreground/30"
                )}
              >
                <Users className="w-6 h-6 flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">I live with people or pets</p>
                  <p className="text-sm text-muted-foreground">Family, roommates, fur babies</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step: Crew */}
        {currentStep === "crew" && (
          <div className="space-y-6">
            <h1 className="font-heading text-3xl font-medium text-foreground text-center leading-tight">
              Who is in your crew?
            </h1>
            <p className="text-sm text-muted-foreground text-center">
              Family, household, roomies, etc.
            </p>

            <div className="space-y-3">
              {familyMembers.map((member, i) => (
                <div key={i} className="flex items-center gap-3">
                  <input
                    type="text"
                    value={member.name}
                    onChange={(e) => updateFamilyMember(i, "name", e.target.value)}
                    className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-foreground outline-none"
                    placeholder="Name"
                  />
                  <input
                    type="text"
                    value={member.age}
                    onChange={(e) => updateFamilyMember(i, "age", e.target.value)}
                    className="w-24 rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-foreground outline-none"
                    placeholder="Age"
                  />
                  <button
                    onClick={() => removeFamilyMember(i)}
                    className="p-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addFamilyMember}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add crew member
            </button>
          </div>
        )}

        {/* Step: Location */}
        {currentStep === "location" && (
          <div className="space-y-8">
            <h1 className="font-heading text-3xl font-medium text-foreground text-center leading-tight">
              Where are you based?
            </h1>
            <GooglePlacesAutocomplete
              value={formData.location}
              onChange={(value) => setFormData(prev => ({ ...prev, location: value }))}
              onPlaceSelect={(place) => setFormData(prev => ({ ...prev, location: place.name }))}
              placeholder="Search your city..."
              showCurrentLocation={false}
              isSelected={false}
            />
          </div>
        )}

        {/* Step: About yourself */}
        {currentStep === "about" && (
          <div className="space-y-6">
            <h1 className="font-heading text-3xl font-medium text-foreground text-center leading-tight">
              About yourself
            </h1>
            <p className="text-sm text-muted-foreground text-center">
              Help others get to know you
            </p>

            <div className="space-y-4">
              <input
                type="text"
                value={formData.profession}
                onChange={(e) => setFormData(prev => ({ ...prev, profession: e.target.value }))}
                className="w-full text-foreground bg-transparent border-b border-border focus:border-foreground outline-none pb-2 text-sm transition-colors"
                placeholder="What do you do? (e.g. Designer, Teacher)"
              />
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                className="w-full text-foreground bg-transparent border-b border-border focus:border-foreground outline-none pb-2 text-sm transition-colors"
                placeholder="Company or organization"
              />
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Social links</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 border border-border rounded-full px-3 py-2.5">
                  <Instagram className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <input
                    type="text"
                    value={formData.instagramHandle}
                    onChange={(e) => setFormData(prev => ({ ...prev, instagramHandle: e.target.value }))}
                    className="flex-1 bg-transparent outline-none text-sm text-foreground min-w-0"
                    placeholder="Instagram"
                  />
                </div>
                <div className="flex items-center gap-2 border border-border rounded-full px-3 py-2.5">
                  <Linkedin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <input
                    type="text"
                    value={formData.linkedinUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, linkedinUrl: e.target.value }))}
                    className="flex-1 bg-transparent outline-none text-sm text-foreground min-w-0"
                    placeholder="LinkedIn"
                  />
                </div>
                <div className="flex items-center gap-2 border border-border rounded-full px-3 py-2.5">
                  <Twitter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <input
                    type="text"
                    value={formData.twitterHandle}
                    onChange={(e) => setFormData(prev => ({ ...prev, twitterHandle: e.target.value }))}
                    className="flex-1 bg-transparent outline-none text-sm text-foreground min-w-0"
                    placeholder="X (Twitter)"
                  />
                </div>
                <div className="flex items-center gap-2 border border-border rounded-full px-3 py-2.5">
                  <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <input
                    type="text"
                    value={formData.personalUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, personalUrl: e.target.value }))}
                    className="flex-1 bg-transparent outline-none text-sm text-foreground min-w-0"
                    placeholder="Website"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step: Interests */}
        {currentStep === "interests" && (
          <div className="space-y-4 -mt-8">
            <h1 className="font-heading text-3xl font-medium text-foreground text-center leading-tight">
              What are you into?
            </h1>
            <p className="text-sm text-muted-foreground text-center">
              Pick at least 3 that feel like you
            </p>

            <div className="overflow-y-auto max-h-[50vh] -mx-2 px-2 pb-2">
              <div className="flex flex-wrap gap-2 justify-center">
                {[...shuffledTags, ...customTags].map(({ label, emoji }) => {
                  const isSelected = formData.interests.includes(label);
                  const size = getBubbleSize(label);
                  return (
                    <button
                      key={label}
                      onClick={() => toggleInterest(label)}
                      className={cn(
                        "rounded-full font-medium transition-all border whitespace-nowrap active:scale-95",
                        size === "sm" && "px-3 py-2 text-xs",
                        size === "md" && "px-4 py-2.5 text-sm",
                        size === "lg" && "px-5 py-3 text-sm",
                        isSelected
                          ? "bg-foreground text-background border-foreground scale-105"
                          : "bg-background text-foreground border-border hover:bg-muted"
                      )}
                      data-testid={`interest-${label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {emoji} {label}
                    </button>
                  );
                })}

                {/* Add your own — inline */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && customInput.trim()) {
                        const tag = customInput.trim();
                        setCustomTags(prev => [...prev, { label: tag, emoji: "✨" }]);
                        setFormData(prev => ({ ...prev, interests: [...prev.interests, tag] }));
                        setCustomInput("");
                      }
                    }}
                    className="rounded-full px-4 py-2.5 text-sm border-2 border-dashed border-border bg-background outline-none focus:border-foreground w-36"
                    placeholder="+ Add your own"
                  />
                </div>
              </div>
            </div>

            {formData.interests.length > 0 && formData.interests.length < 3 && (
              <p className="text-xs text-muted-foreground text-center">
                {3 - formData.interests.length} more to go
              </p>
            )}
          </div>
        )}

        {/* Step: Photos */}
        {currentStep === "photos" && (
          <div className="space-y-6">
            <h1 className="font-heading text-3xl font-medium text-foreground text-center leading-tight">
              Show off your crew
            </h1>
            <p className="text-sm text-muted-foreground text-center">
              Add at least 3 photos — tap a photo to add a caption
            </p>

            {uploadingSlot !== null && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <div className="w-4 h-4 rounded-full border-2 border-foreground border-t-transparent animate-spin" />
                Uploading...
              </div>
            )}

            <PhotoGrid
              photos={profilePhotos}
              onUpload={handlePhotoUpload}
              onEditCaption={handleEditCaption}
            />

            {profilePhotos.length > 0 && profilePhotos.length < 3 && (
              <p className="text-xs text-muted-foreground text-center">
                {3 - profilePhotos.length} more photo{3 - profilePhotos.length !== 1 ? "s" : ""} needed
              </p>
            )}

            {/* Caption edit dialog */}
            {captionEditIndex !== null && (
              <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4">
                <div className="bg-background rounded-2xl p-6 w-full max-w-md space-y-4">
                  <h3 className="font-medium text-foreground">Add a caption</h3>
                  <input
                    type="text"
                    value={captionDraft}
                    onChange={(e) => setCaptionDraft(e.target.value)}
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-foreground"
                    placeholder="What's happening in this photo?"
                    autoFocus
                    maxLength={100}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setCaptionEditIndex(null); setCaptionDraft(""); }}
                      className="flex-1 py-3 rounded-full border border-border text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveCaption}
                      className="flex-1 py-3 rounded-full bg-foreground text-background text-sm font-medium"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step: Bio */}
        {currentStep === "bio" && (
          <div className="space-y-6">
            <h1 className="font-heading text-3xl font-medium text-foreground text-center leading-tight">
              Write a short bio
            </h1>
            <p className="text-sm text-muted-foreground text-center">
              Give others a feel for who you are
            </p>

            {/* Expandable hints */}
            <button
              onClick={() => setShowBioHints(!showBioHints)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-muted/50 text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              <span>Share things like...</span>
              <ChevronDown className={cn("w-4 h-4 transition-transform", showBioHints && "rotate-180")} />
            </button>
            {showBioHints && (
              <ul className="px-4 space-y-1.5">
                {BIO_HINTS.map((hint, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-foreground/40 mt-0.5">-</span>
                    {hint}
                  </li>
                ))}
              </ul>
            )}

            <div className="relative">
              <textarea
                value={formData.bio}
                onChange={(e) => {
                  if (e.target.value.length <= 500) {
                    setFormData(prev => ({ ...prev, bio: e.target.value }));
                  }
                }}
                className="w-full min-h-[160px] rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-foreground resize-none"
                placeholder="We're a family of four who love road trips, board games, and trying every taco spot we can find..."
              />
              <span className="absolute bottom-3 right-3 text-xs text-muted-foreground">
                {formData.bio.length}/500
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Sticky footer — right-aligned dark pill button */}
      <div className="sticky bottom-0 px-6 py-6 bg-background" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}>
        <div className="max-w-md mx-auto flex justify-end">
          <button
            onClick={handleNext}
            disabled={!canProceed() || onboardingMutation.isPending}
            className={cn(
              "flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-medium text-sm transition-all",
              canProceed() && !onboardingMutation.isPending
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
            data-testid="button-next"
          >
            {onboardingMutation.isPending ? (
              <div className="w-5 h-5 rounded-full border-2 border-background border-t-transparent animate-spin" />
            ) : isLastStep ? (
              <>
                Get Started
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              'Next'
            )}
          </button>
        </div>
      </div>

      {/* Exit confirmation dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave profile creation?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress won't be saved. You can always come back and finish later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep going</AlertDialogCancel>
            <AlertDialogAction onClick={() => signOut()}>Leave</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function Onboarding() {
  return (
    <GoogleMapsProvider>
      <OnboardingInner />
    </GoogleMapsProvider>
  );
}
