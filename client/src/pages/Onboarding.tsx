import { useState } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Heart, MapPin, Users, Sparkles, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/shared/ImageUpload";

const INTEREST_OPTIONS = [
  "Hiking", "Food", "Nature", "Art", "Sports", "Music", 
  "Science", "Reading", "Gaming", "Travel", "Crafts", "Beach"
];

export default function Onboarding() {
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

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      onboardingMutation.mutate(formData);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.name.length > 0 && formData.location.length > 0;
      case 2:
        return formData.kids.length > 0;
      case 3:
        return formData.interests.length > 0;
      default:
        return true;
    }
  };

  return (
    <div className="min-h-screen bg-soft-beige">
      <div className="max-w-md mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-warm-teal to-warm-teal/80 flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-outfit font-bold text-charcoal mb-2">
            Welcome to FamVoy!
          </h1>
          <p className="text-charcoal/60">
            Let's set up your family profile
          </p>
        </motion.div>

        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                s <= step ? 'bg-warm-teal' : 'bg-charcoal/10'
              }`}
            />
          ))}
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white rounded-3xl p-6 shadow-sm"
        >
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-warm-teal/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-warm-teal" />
                </div>
                <div>
                  <h2 className="font-outfit font-semibold text-charcoal">Your Family</h2>
                  <p className="text-sm text-charcoal/60">Tell us about yourselves</p>
                </div>
              </div>

              <div className="flex justify-center mb-4">
                <ImageUpload
                  currentImage={formData.avatar}
                  onImageChange={(url) => setFormData(prev => ({ ...prev, avatar: url }))}
                  size="lg"
                />
              </div>
              <p className="text-xs text-center text-charcoal/50 -mt-2 mb-4">
                Add a family photo (optional)
              </p>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-charcoal">Family Name</Label>
                  <Input
                    id="name"
                    placeholder="The Smiths"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1.5"
                    data-testid="input-family-name"
                  />
                </div>

                <div>
                  <Label htmlFor="location" className="text-charcoal">Your City</Label>
                  <div className="relative mt-1.5">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/40" />
                    <Input
                      id="location"
                      placeholder="San Francisco, CA"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      className="pl-10"
                      data-testid="input-location"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-warm-coral/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-warm-coral" />
                </div>
                <div>
                  <h2 className="font-outfit font-semibold text-charcoal">Your Kids</h2>
                  <p className="text-sm text-charcoal/60">Help us find age-appropriate activities</p>
                </div>
              </div>

              <div>
                <Label htmlFor="kids" className="text-charcoal">Kids Info</Label>
                <Input
                  id="kids"
                  placeholder="2 kids • ages 4 & 7"
                  value={formData.kids}
                  onChange={(e) => setFormData(prev => ({ ...prev, kids: e.target.value }))}
                  className="mt-1.5"
                  data-testid="input-kids"
                />
                <p className="text-xs text-charcoal/50 mt-1.5">
                  Example: "2 kids • ages 4 & 7" or "1 toddler"
                </p>
              </div>

              <div>
                <Label htmlFor="bio" className="text-charcoal">Family Bio (optional)</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell other families a bit about yourselves..."
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  className="mt-1.5 resize-none"
                  rows={3}
                  data-testid="input-bio"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-warm-teal/10 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-warm-teal" />
                </div>
                <div>
                  <h2 className="font-outfit font-semibold text-charcoal">Your Interests</h2>
                  <p className="text-sm text-charcoal/60">Select what your family enjoys</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map((interest) => {
                  const isSelected = formData.interests.includes(interest);
                  return (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      className="px-4 py-2 rounded-full text-sm font-medium transition-all border-2"
                      style={{
                        backgroundColor: isSelected ? '#2A9D8F' : '#ffffff',
                        color: isSelected ? '#ffffff' : '#333333',
                        borderColor: isSelected ? '#2A9D8F' : 'rgba(51,51,51,0.2)',
                        boxShadow: isSelected ? '0 4px 6px -1px rgba(42, 157, 143, 0.3)' : 'none',
                      }}
                      data-testid={`interest-${interest.toLowerCase()}`}
                    >
                      {isSelected && (
                        <Check className="w-3 h-3 inline mr-1" />
                      )}
                      {interest}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>

        <div className="mt-6 flex gap-3">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="flex-1 rounded-full"
              style={{
                border: '2px solid #333',
                color: '#333',
                backgroundColor: 'transparent',
              }}
              data-testid="button-back"
            >
              Back
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!canProceed() || onboardingMutation.isPending}
            className="flex-1 rounded-full transition-all"
            style={{
              backgroundColor: (!canProceed() || onboardingMutation.isPending) ? '#d1d5db' : '#2A9D8F',
              color: (!canProceed() || onboardingMutation.isPending) ? '#6b7280' : '#ffffff',
              cursor: (!canProceed() || onboardingMutation.isPending) ? 'not-allowed' : 'pointer',
              boxShadow: (!canProceed() || onboardingMutation.isPending) ? 'none' : '0 10px 15px -3px rgba(42, 157, 143, 0.3)',
            }}
            data-testid="button-next"
          >
            {onboardingMutation.isPending ? (
              <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : step === 3 ? (
              <>
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            ) : (
              'Continue'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
