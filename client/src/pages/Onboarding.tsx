import { useState } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { ArrowRight, Plus, X } from "lucide-react";
import { ImageUpload } from "@/components/shared/ImageUpload";
import { GooglePlacesAutocomplete } from "@/components/shared/GooglePlacesAutocomplete";
import { GoogleMapsProvider } from "@/components/shared/GoogleMapsProvider";

const INTEREST_OPTIONS = [
  { label: "Hiking", emoji: "🥾" },
  { label: "Beach", emoji: "🏖️" },
  { label: "Parks", emoji: "🌳" },
  { label: "Museums", emoji: "🏛️" },
  { label: "Sports", emoji: "⚽" },
  { label: "Art", emoji: "🎨" },
  { label: "Music", emoji: "🎵" },
  { label: "Cooking", emoji: "🍳" },
  { label: "Reading", emoji: "📚" },
  { label: "Travel", emoji: "✈️" },
  { label: "Camping", emoji: "🏕️" },
  { label: "Nature", emoji: "🌿" },
  { label: "Science", emoji: "🔬" },
  { label: "Swimming", emoji: "🏊" },
  { label: "Food", emoji: "🍕" },
  { label: "Dance", emoji: "💃" },
];

const TOTAL_STEPS = 5;

function ProgressRing({ step, total }: { step: number; total: number }) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const progress = (step / total) * circumference;

  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={radius} fill="none" stroke="currentColor" strokeWidth="2" className="text-border" />
        <circle
          cx="24" cy="24" r={radius} fill="none" stroke="currentColor" strokeWidth="2.5"
          className="text-foreground transition-all duration-500"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-xs font-medium text-foreground">{step}/{total}</span>
    </div>
  );
}

function OnboardingInner() {
  const { user: clerkUser } = useUser();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: clerkUser?.fullName || "",
    location: "",
    kids: "",
    interests: [] as string[],
    bio: "",
    avatar: clerkUser?.imageUrl || "",
  });
  const [familyMembers, setFamilyMembers] = useState<{ name: string; age: string }[]>([]);

  const onboardingMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const token = await getToken();
      const res = await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          kids: familyMembers.length > 0
            ? familyMembers.map(m => `${m.name} (${m.age})`).join(", ")
            : data.kids,
          avatar: data.avatar || clerkUser?.imageUrl || 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=400',
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

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      onboardingMutation.mutate(formData);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return formData.name.length > 0;
      case 2: return formData.location.length > 0;
      case 3: return true; // family members optional
      case 4: return formData.interests.length >= 1;
      case 5: return true; // photo optional
      default: return true;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with progress ring */}
      <div className="flex items-center justify-between px-6 pt-14 md:pt-8">
        {step > 1 ? (
          <button
            onClick={() => setStep(step - 1)}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-back"
          >
            Back
          </button>
        ) : (
          <div />
        )}
        <ProgressRing step={step} total={TOTAL_STEPS} />
        {step < TOTAL_STEPS ? (
          <button
            onClick={() => setStep(step + 1)}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip
          </button>
        ) : (
          <div />
        )}
      </div>

      {/* Step content */}
      <div className="flex-1 flex flex-col justify-center px-6 max-w-md mx-auto w-full">
        {step === 1 && (
          <div className="space-y-8">
            <h1 className="font-heading text-3xl font-medium text-foreground text-center leading-tight">
              What's your family name?
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

        {step === 2 && (
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

        {step === 3 && (
          <div className="space-y-6">
            <h1 className="font-heading text-3xl font-medium text-foreground text-center leading-tight">
              Who's in your family?
            </h1>
            <p className="text-sm text-muted-foreground text-center">
              Add your family members so we can suggest great experiences
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
              Add family member
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <h1 className="font-heading text-3xl font-medium text-foreground text-center leading-tight">
              What does your family love?
            </h1>
            <p className="text-sm text-muted-foreground text-center">
              Select at least one interest
            </p>

            <div className="flex flex-wrap gap-2 justify-center">
              {INTEREST_OPTIONS.map(({ label, emoji }) => {
                const isSelected = formData.interests.includes(label);
                return (
                  <button
                    key={label}
                    onClick={() => toggleInterest(label)}
                    className={cn(
                      "rounded-full px-4 py-2.5 text-sm font-medium transition-all border",
                      isSelected
                        ? "bg-foreground text-background border-foreground"
                        : "bg-background text-foreground border-border hover:bg-muted"
                    )}
                    data-testid={`interest-${label.toLowerCase()}`}
                  >
                    {emoji} {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-8">
            <h1 className="font-heading text-3xl font-medium text-foreground text-center leading-tight">
              Add a family photo
            </h1>
            <p className="text-sm text-muted-foreground text-center">
              Help other families get to know you
            </p>

            <div className="flex justify-center">
              <ImageUpload
                currentImage={formData.avatar}
                onImageChange={(url) => setFormData(prev => ({ ...prev, avatar: url }))}
                size="lg"
              />
            </div>
          </div>
        )}
      </div>

      {/* Sticky footer with Next button */}
      <div className="sticky bottom-0 px-6 py-6 bg-background" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}>
        <button
          onClick={handleNext}
          disabled={!canProceed() || onboardingMutation.isPending}
          className={cn(
            "w-full max-w-md mx-auto flex items-center justify-center gap-2 py-4 rounded-full font-medium text-base transition-all",
            canProceed() && !onboardingMutation.isPending
              ? "bg-foreground text-background"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
          data-testid="button-next"
        >
          {onboardingMutation.isPending ? (
            <div className="w-5 h-5 rounded-full border-2 border-background border-t-transparent animate-spin" />
          ) : step === TOTAL_STEPS ? (
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
  );
}

export default function Onboarding() {
  return (
    <GoogleMapsProvider>
      <OnboardingInner />
    </GoogleMapsProvider>
  );
}
