import { ExperienceCard } from "@/components/shared/ExperienceCard";
import { PodCard } from "@/components/shared/PodCard";
import { TripCard } from "@/components/shared/TripCard";
import { ImageUpload } from "@/components/shared/ImageUpload";
import { GooglePlacesAutocomplete } from "@/components/shared/GooglePlacesAutocomplete";
import { VerificationBadge } from "@/components/shared/VerificationBadge";
import { Settings as SettingsIcon, MapPin, Edit2, X, Check, Award, Heart, Globe, Quote, Plane, Users, Share2, UserPlus, ChevronLeft, Star, Instagram, Linkedin, Twitter, Briefcase, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatExperience } from "@/lib/types";
import { useClerk } from "@clerk/clerk-react";
import { useLocation } from "wouter";
import type { FamilyMember } from "@shared/schema";
import { FAMILY_VALUES, LANGUAGES, FAMILY_ROLES, AGE_GROUPS } from "@/lib/constants";
import { Plus, Trash2 } from "lucide-react";
import { ImageCarousel } from "@/components/ui/image-carousel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const BADGE_ICONS: Record<string, string> = {
  "Park Explorer": "🌲",
  "Outdoor Explorer": "🏕️",
  "Social Butterfly": "🦋",
  "Pod Leader": "👑",
  "Adventure Seeker": "🗺️",
  "Review Star": "⭐",
  "Photo Pro": "📸",
  "Family Champion": "🏆",
  "First Steps": "👣",
  "Community Builder": "🤝",
};

const INTEREST_EMOJIS: Record<string, string> = {
  "Hiking": "🥾",
  "Beach": "🏖️",
  "Parks": "🌳",
  "Museums": "🏛️",
  "Playgrounds": "🛝",
  "Sports": "⚽",
  "Art": "🎨",
  "Music": "🎵",
  "Cooking": "🍳",
  "Reading": "📚",
  "Travel": "✈️",
  "Camping": "🏕️",
  "Biking": "🚲",
  "Swimming": "🏊",
  "Dance": "💃",
  "Food": "🍕",
  "Nature": "🌿",
  "Science": "🔬",
};

const INTEREST_OPTIONS = Object.keys(INTEREST_EMOJIS);

function ProfileInner() {
  const [activeTab, setActiveTab] = useState<"experiences" | "saved" | "trips">("experiences");
  const [showMeetModal, setShowMeetModal] = useState(false);
  const [isEditing, setIsEditing] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("edit") === "true";
  });
  const [followSheet, setFollowSheet] = useState<"following" | "followers" | null>(null);
  const [followSearch, setFollowSearch] = useState("");
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMember, setNewMember] = useState({
    name: "",
    role: "",
    ageGroup: "",
    isAdult: true,
    photo: "",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    location: "",
    kids: "",
    bio: "",
    interests: [] as string[],
    avatar: "",
    familyValues: [] as string[],
    languages: [] as string[],
    pets: "",
    familyMotto: "",
    favoriteTraditions: "",
    dreamVacation: "",
  });
  const [, setLocation] = useLocation();

  const queryClient = useQueryClient();
  const { signOut } = useClerk();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: api.users.getMe,
  });

  const { data: followersData = [] } = useQuery({
    queryKey: ["followersCount", currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      return api.follows.getFollowers(currentUser.id);
    },
    enabled: !!currentUser,
  });

  const { data: followingData = [] } = useQuery({
    queryKey: ["followingCount", currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      return api.follows.getFollowing(currentUser.id);
    },
    enabled: !!currentUser,
  });

  useEffect(() => {
    if (currentUser && !isEditing) {
      setEditForm({
        name: currentUser.name || "",
        location: currentUser.location || "",
        kids: currentUser.kids || "",
        bio: currentUser.bio || "",
        interests: currentUser.interests || [],
        avatar: currentUser.avatar || "",
        familyValues: currentUser.familyValues || [],
        languages: currentUser.languages || [],
        pets: currentUser.pets || "",
        familyMotto: currentUser.familyMotto || "",
        favoriteTraditions: currentUser.favoriteTraditions || "",
        dreamVacation: currentUser.dreamVacation || "",
      });
    }
  }, [currentUser, isEditing]);

  const { getToken } = useClerk().session || {};

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const token = getToken ? await getToken() : null;
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/auth/user/profile', {
        method: 'PATCH',
        headers,
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error('Failed to update profile');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      setIsEditing(false);
    },
  });

  const toggleInterest = (interest: string) => {
    setEditForm(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const toggleFamilyValue = (value: string) => {
    setEditForm(prev => ({
      ...prev,
      familyValues: prev.familyValues.includes(value)
        ? prev.familyValues.filter(v => v !== value)
        : [...prev.familyValues, value]
    }));
  };

  const toggleLanguage = (language: string) => {
    setEditForm(prev => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter(l => l !== language)
        : [...prev.languages, language]
    }));
  };

  const addMemberMutation = useMutation({
    mutationFn: () => api.familyMembers.create(newMember),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["familyMembers"] });
      setShowAddMemberModal(false);
      setNewMember({ name: "", role: "", ageGroup: "", isAdult: true, photo: "" });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: (memberId: number) => api.familyMembers.delete(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["familyMembers"] });
    },
  });

  const { data: userExperiences = [] } = useQuery({
    queryKey: ["userExperiences", currentUser?.id],
    queryFn: () => currentUser ? api.users.getExperiences(currentUser.id) : [],
    enabled: !!currentUser,
    staleTime: 5 * 60 * 1000,
  });

  const { data: savedExperiences = [] } = useQuery({
    queryKey: ["savedExperiences", currentUser?.id],
    queryFn: () => currentUser ? api.users.getSavedExperiences(currentUser.id) : [],
    enabled: !!currentUser && activeTab === "saved",
    staleTime: 5 * 60 * 1000,
  });

  const { data: pods = [] } = useQuery({
    queryKey: ["userPods", currentUser?.id],
    queryFn: () => currentUser ? api.users.getPods(currentUser.id) : [],
    enabled: !!currentUser,
    staleTime: 5 * 60 * 1000,
  });

  const { data: userBadges = [] } = useQuery({
    queryKey: ["userBadges", currentUser?.id],
    queryFn: () => currentUser ? api.badges.getByUser(currentUser.id) : [],
    enabled: !!currentUser,
    staleTime: 5 * 60 * 1000,
  });

  const { data: userTrips = [] } = useQuery({
    queryKey: ["userTrips", currentUser?.id],
    queryFn: api.users.getMyTrips,
    enabled: !!currentUser,
    staleTime: 5 * 60 * 1000,
  });

  const { data: userCheckins = [] } = useQuery({
    queryKey: ["userCheckins", currentUser?.id],
    queryFn: () => currentUser ? api.checkins.getByUser(currentUser.id) : [],
    enabled: !!currentUser,
    staleTime: 5 * 60 * 1000,
  });

  const { data: travelStats } = useQuery({
    queryKey: ["travelStats", currentUser?.id],
    queryFn: () => currentUser ? api.travelStats.get(currentUser.id) : null,
    enabled: !!currentUser,
    staleTime: 5 * 60 * 1000,
  });

  const { data: familyMembers = [] } = useQuery<FamilyMember[]>({
    queryKey: ["familyMembers", currentUser?.id],
    queryFn: () => currentUser ? api.users.getFamilyMembers(currentUser.id) : [],
    enabled: !!currentUser,
  });

  const { data: profilePhotos = [] } = useQuery({
    queryKey: ["profilePhotos", currentUser?.id],
    queryFn: () => currentUser ? api.users.getProfilePhotos(currentUser.id) : [],
    enabled: !!currentUser,
  });

  const formattedUserExperiences = userExperiences.map(exp => formatExperience(exp as any));
  const formattedSavedExperiences = savedExperiences.map(exp => formatExperience(exp as any));

  // Profile completeness check
  const completenessItems = [
    { label: "Photo", done: !!(currentUser?.avatar) },
    { label: "Bio", done: !!(currentUser?.bio) },
    { label: "Location", done: !!(currentUser?.location) },
    ...(currentUser?.householdType === "solo" ? [] : [{ label: "Crew member", done: familyMembers.length > 0 }]),
    { label: "Interests", done: (currentUser?.interests?.length || 0) >= 3 },
  ];
  const completenessScore = completenessItems.filter(i => i.done).length;
  const isProfileComplete = completenessScore === completenessItems.length;

  const handleShareProfile = () => {
    if (navigator.share) {
      navigator.share({
        title: `${currentUser?.name || 'Family'}'s Profile`,
        text: `Check out ${currentUser?.name || 'our family'}'s profile on FamVoy!`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  // Edit mode
  if (isEditing) {
    return (
      <div className="min-h-screen bg-background pt-14 md:pt-8 pb-32 md:pb-8 px-6 md:max-w-4xl md:mx-auto">
        <div className="mb-6 flex justify-between">
          <button
            onClick={() => setIsEditing(false)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            data-testid="button-cancel-edit"
          >
            <ChevronLeft className="h-4 w-4" />
            Cancel
          </button>
          <button
            onClick={() => updateProfileMutation.mutate()}
            disabled={updateProfileMutation.isPending}
            className="flex items-center gap-2 px-5 py-2 bg-foreground text-background rounded-full font-medium text-sm"
            data-testid="button-save-profile"
          >
            <Check className="h-4 w-4" />
            Save
          </button>
        </div>

        <div className="space-y-6 mb-8">
          <div className="flex flex-col items-center">
            <ImageUpload
              currentImage={editForm.avatar}
              onImageChange={(url) => setEditForm({ ...editForm, avatar: url })}
              size="lg"
            />
            <p className="text-xs text-muted-foreground mt-2">Tap to change photo</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Family Name</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full rounded-xl border border-border bg-background p-4 text-base focus:border-foreground focus:outline-none"
              placeholder="Your family name"
              data-testid="input-edit-name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Location</label>
            <GooglePlacesAutocomplete
              value={editForm.location}
              onChange={(value) => setEditForm({ ...editForm, location: value })}
              onPlaceSelect={(place) => setEditForm({ ...editForm, location: place.name })}
              placeholder="City, State"
              showCurrentLocation={false}
              isSelected={false}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Bio</label>
            <textarea
              value={editForm.bio}
              onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
              className="w-full rounded-xl border border-border bg-background p-4 text-base focus:border-foreground focus:outline-none resize-none"
              rows={3}
              placeholder="Tell other families about you..."
              data-testid="input-edit-bio"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Interests</label>
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((interest) => (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-all border",
                    editForm.interests.includes(interest)
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background text-muted-foreground border-border hover:bg-muted"
                  )}
                  data-testid={`button-interest-${interest.toLowerCase()}`}
                >
                  {INTEREST_EMOJIS[interest]} {interest}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Family Values</label>
            <div className="flex flex-wrap gap-2">
              {FAMILY_VALUES.map((value) => (
                <button
                  key={value}
                  onClick={() => toggleFamilyValue(value)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-all border",
                    editForm.familyValues.includes(value)
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background text-muted-foreground border-border hover:bg-muted"
                  )}
                  data-testid={`button-value-${value.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Languages We Speak</label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((language) => (
                <button
                  key={language}
                  onClick={() => toggleLanguage(language)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-all border",
                    editForm.languages.includes(language)
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background text-muted-foreground border-border hover:bg-muted"
                  )}
                  data-testid={`button-language-${language.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {language}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Pets</label>
            <input
              type="text"
              value={editForm.pets}
              onChange={(e) => setEditForm({ ...editForm, pets: e.target.value })}
              className="w-full rounded-xl border border-border bg-background p-4 text-base focus:border-foreground focus:outline-none"
              placeholder="e.g., Dog named Max, 2 cats"
              data-testid="input-edit-pets"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Family Motto</label>
            <input
              type="text"
              value={editForm.familyMotto}
              onChange={(e) => setEditForm({ ...editForm, familyMotto: e.target.value })}
              className="w-full rounded-xl border border-border bg-background p-4 text-base focus:border-foreground focus:outline-none"
              placeholder="e.g., Adventure awaits!"
              data-testid="input-edit-motto"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Favorite Traditions</label>
            <textarea
              value={editForm.favoriteTraditions}
              onChange={(e) => setEditForm({ ...editForm, favoriteTraditions: e.target.value })}
              className="w-full rounded-xl border border-border bg-background p-4 text-base focus:border-foreground focus:outline-none resize-none"
              rows={2}
              placeholder="e.g., Sunday pancakes, Friday movie nights"
              data-testid="input-edit-traditions"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Dream Vacation</label>
            <input
              type="text"
              value={editForm.dreamVacation}
              onChange={(e) => setEditForm({ ...editForm, dreamVacation: e.target.value })}
              className="w-full rounded-xl border border-border bg-background p-4 text-base focus:border-foreground focus:outline-none"
              placeholder="e.g., Disney World, Japan"
              data-testid="input-edit-dream-vacation"
            />
          </div>

          <div className="border-t border-border pt-6">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-foreground">Crew Members</label>
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-foreground text-background text-sm font-medium rounded-full"
                data-testid="button-add-member"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>

            {familyMembers.length === 0 ? (
              <div className="text-center py-8 bg-muted rounded-2xl border border-dashed border-border">
                <UserPlus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No crew members added yet</p>
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="mt-2 text-sm text-foreground font-medium"
                >
                  Add your first crew member
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {familyMembers.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 p-3 bg-card rounded-2xl">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex-shrink-0">
                      {member.photo ? (
                        <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg bg-muted text-muted-foreground">
                          {member.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.role}</p>
                      {member.ageGroup && (
                        <p className="text-[11px] text-muted-foreground/70">{member.ageGroup}</p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteMemberMutation.mutate(member.id)}
                      disabled={deleteMemberMutation.isPending}
                      className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                      data-testid={`button-delete-member-${member.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {showAddMemberModal && (
          <AddMemberModal
            showModal={showAddMemberModal}
            setShowModal={setShowAddMemberModal}
            newMember={newMember}
            setNewMember={setNewMember}
            addMemberMutation={addMemberMutation}
          />
        )}

        {/* Followers/Following Sheet */}
        <Sheet open={followSheet !== null} onOpenChange={(open) => { if (!open) { setFollowSheet(null); setFollowSearch(""); } }}>
          <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>{followSheet === "followers" ? "Followers" : "Following"}</SheetTitle>
            </SheetHeader>
            <div className="px-4 pt-3 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={followSearch}
                  onChange={(e) => setFollowSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-full border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 px-4 pb-4">
              {(() => {
                const list = followSheet === "followers" ? followersData : followingData;
                const filtered = list.filter((u: any) =>
                  (u.name || "").toLowerCase().includes(followSearch.toLowerCase())
                );
                if (filtered.length === 0) {
                  return (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {followSearch
                        ? "No results found"
                        : followSheet === "followers"
                          ? "No followers yet"
                          : "Not following anyone yet"}
                    </p>
                  );
                }
                return filtered.map((user: any) => (
                  <button
                    key={user.id}
                    onClick={() => { setFollowSheet(null); setFollowSearch(""); setLocation(`/family-profile/${user.id}`); }}
                    className="flex items-center gap-3 w-full py-3 border-b border-border/50 last:border-0 text-left hover:bg-muted/30 rounded-lg px-2 transition-colors"
                  >
                    {user.avatar || user.profileImageUrl ? (
                      <img
                        src={user.avatar || user.profileImageUrl}
                        alt={user.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
                        {(user.name || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                      {user.location && (
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {user.location}
                        </p>
                      )}
                    </div>
                  </button>
                ));
              })()}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // Profile photos for carousel — use profile_photos table, fall back to avatar
  const profileImages = profilePhotos.length > 0
    ? profilePhotos.map(p => p.url)
    : [currentUser?.avatar || currentUser?.profileImageUrl || ""].filter(Boolean);

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-8 md:max-w-5xl md:mx-auto md:px-8">
      {/* Top bar — Instagram-style corner icon */}
      <div className="flex justify-end items-center px-6 pt-16 md:pt-8 pb-2">
        <button
          onClick={() => setLocation("/settings")}
          className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-settings"
        >
          <SettingsIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Profile Hero - Kindred style */}
      <div className="px-6 py-4">
        {/* Photo carousel */}
        <ImageCarousel
          images={profileImages}
          alt={currentUser?.name || "Profile"}
          aspectRatio="aspect-square"
          className="rounded-2xl max-w-[280px] mx-auto"
        />

        {/* Name + verification */}
        <div className="mt-5 text-center">
          <div className="flex items-center justify-center gap-2">
            <h1 className="font-heading text-2xl font-medium text-foreground" data-testid="text-username">
              {currentUser?.name || "Loading..."}
            </h1>
            {(currentUser as any)?.isVerified && <VerificationBadge size="md" />}
          </div>

          {/* Location */}
          {currentUser?.location && (
            <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {currentUser.location}
            </p>
          )}

          {/* Last active */}
          <p className="text-xs text-muted-foreground/60 mt-1">
            Active today
          </p>
        </div>

        {/* Stats row */}
        <div className="mt-5 flex items-center justify-center gap-6">
          <button className="text-center" data-testid="button-following" onClick={() => setFollowSheet("following")}>
            <p className="text-lg font-semibold text-foreground">{followingData.length}</p>
            <p className="text-xs text-muted-foreground">following</p>
          </button>
          <div className="w-px h-8 bg-border" />
          <button className="text-center" data-testid="button-followers" onClick={() => setFollowSheet("followers")}>
            <p className="text-lg font-semibold text-foreground">{followersData.length}</p>
            <p className="text-xs text-muted-foreground">followers</p>
          </button>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">
              {travelStats?.totalTrips || userTrips.length}
            </p>
            <p className="text-xs text-muted-foreground">trips</p>
          </div>
        </div>

        {/* Bio */}
        {currentUser?.bio && (
          <p className="text-sm text-foreground mt-4 text-center max-w-md mx-auto leading-relaxed">
            {currentUser.bio}
          </p>
        )}

        {/* Meet button */}
        <div className="mt-5 max-w-sm mx-auto">
          <button
            onClick={() => setShowMeetModal(true)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-foreground text-background rounded-full font-medium text-sm"
            data-testid="button-meet"
          >
            Meet {currentUser?.name?.split(" ")[0] || "Me"}
          </button>
        </div>
      </div>

      {/* Profile completeness nudge */}
      {!isProfileComplete && (
        <div className="mx-6 mt-4 rounded-2xl bg-card border border-border p-5">
          <p className="text-sm text-foreground font-medium mb-1">
            Complete your profile
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Would this get families excited to travel with you?
          </p>
          <div className="flex gap-2 mb-3">
            {completenessItems.map((item) => (
              <div
                key={item.label}
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  item.done ? "bg-emerald-500" : "bg-border"
                )}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {completenessItems.filter(i => !i.done).map((item) => (
              <span key={item.label} className="text-[11px] px-2.5 py-1 rounded-full border border-border text-muted-foreground">
                + {item.label}
              </span>
            ))}
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="mt-3 w-full py-2.5 bg-foreground text-background rounded-full font-medium text-sm"
          >
            Complete Profile
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="mt-6 sticky top-14 z-20 bg-background border-b border-border">
        <div className="flex px-6">
          {[
            { id: "experiences", label: "Experiences" },
            { id: "trips", label: "Trips" },
            { id: "saved", label: "Saved" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex-1 py-3.5 text-sm font-medium transition-all border-b-2",
                activeTab === tab.id
                  ? "text-foreground border-foreground"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              )}
              data-testid={`button-tab-${tab.id}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-6 py-6">
        {activeTab === "experiences" && (
          <div>
            {formattedUserExperiences.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-foreground font-medium">No experiences shared yet</p>
                <p className="text-sm text-muted-foreground mt-1">Share your first family adventure!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...formattedUserExperiences].reverse().map((exp) => (
                  <ExperienceCard key={exp.id} experience={exp} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "trips" && (
          <div>
            {userTrips.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plane className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-foreground font-medium">No trips planned yet</p>
                <p className="text-sm text-muted-foreground mt-1">Join a pod and start planning!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userTrips.map((trip: any) => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "saved" && (
          <div>
            {formattedSavedExperiences.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-foreground font-medium">No saved experiences yet</p>
                <p className="text-sm text-muted-foreground mt-1">Save experiences you want to try!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...formattedSavedExperiences].reverse().map((exp) => (
                  <ExperienceCard key={exp.id} experience={exp} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showAddMemberModal && (
        <AddMemberModal
          showModal={showAddMemberModal}
          setShowModal={setShowAddMemberModal}
          newMember={newMember}
          setNewMember={setNewMember}
          addMemberMutation={addMemberMutation}
        />
      )}

      {/* Meet modal */}
      <Sheet open={showMeetModal} onOpenChange={setShowMeetModal}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
          <SheetHeader className="text-left pb-4">
            <SheetTitle className="font-heading text-xl">
              Meet {currentUser?.name || ""}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-6 pb-8">
            {/* Profile photos grid */}
            {profilePhotos.length > 0 && (
              <section>
                <div className="grid grid-cols-3 gap-1.5 rounded-2xl overflow-hidden">
                  {profilePhotos.map((photo, i) => (
                    <div
                      key={photo.id}
                      className={cn(
                        "relative overflow-hidden",
                        i === 0 && profilePhotos.length > 1 && "col-span-2 row-span-2"
                      )}
                    >
                      <img
                        src={photo.url}
                        alt={photo.caption || ""}
                        className={cn(
                          "w-full object-cover",
                          i === 0 && profilePhotos.length > 1 ? "aspect-square" : "aspect-square"
                        )}
                      />
                      {photo.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
                          <p className="text-white text-xs">{photo.caption}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Bio */}
            {currentUser?.bio && (
              <p className="text-sm text-foreground leading-relaxed">{currentUser.bio}</p>
            )}

            {/* Location */}
            {currentUser?.location && (
              <section className="flex items-center gap-2 text-sm text-foreground">
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span>{currentUser.location}</span>
              </section>
            )}

            {/* Profession / Company */}
            {(currentUser?.profession || currentUser?.company) && (
              <section className="flex items-center gap-2 text-sm text-foreground">
                <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span>
                  {currentUser.profession}{currentUser.profession && currentUser.company ? " at " : ""}{currentUser.company}
                </span>
              </section>
            )}

            {/* Social links */}
            {(currentUser?.instagramHandle || currentUser?.linkedinUrl || currentUser?.twitterHandle || currentUser?.personalUrl) && (
              <section>
                <div className="flex flex-wrap gap-2">
                  {currentUser.instagramHandle && (
                    <a
                      href={`https://instagram.com/${currentUser.instagramHandle.replace(/^@/, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <Instagram className="h-3.5 w-3.5" />
                      {currentUser.instagramHandle}
                    </a>
                  )}
                  {currentUser.linkedinUrl && (
                    <a
                      href={currentUser.linkedinUrl.startsWith("http") ? currentUser.linkedinUrl : `https://linkedin.com/in/${currentUser.linkedinUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <Linkedin className="h-3.5 w-3.5" />
                      LinkedIn
                    </a>
                  )}
                  {currentUser.twitterHandle && (
                    <a
                      href={`https://x.com/${currentUser.twitterHandle.replace(/^@/, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <Twitter className="h-3.5 w-3.5" />
                      {currentUser.twitterHandle}
                    </a>
                  )}
                  {currentUser.personalUrl && (
                    <a
                      href={currentUser.personalUrl.startsWith("http") ? currentUser.personalUrl : `https://${currentUser.personalUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      Website
                    </a>
                  )}
                </div>
              </section>
            )}

            {/* Household */}
            {familyMembers.length > 0 && (
              <section>
                <h3 className="font-heading text-base font-medium text-foreground mb-3">Household</h3>
                <div className="flex flex-wrap gap-4">
                  {familyMembers.map((member) => (
                    <div key={member.id} className="flex flex-col items-center w-20">
                      <div className="w-14 h-14 rounded-full overflow-hidden bg-muted">
                        {member.photo ? (
                          <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-base text-muted-foreground">
                            {member.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <p className="mt-1 text-xs font-medium text-foreground text-center truncate w-full">{member.name}</p>
                      <p className="text-[10px] text-muted-foreground">{member.role}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Interests */}
            {currentUser?.interests && currentUser.interests.length > 0 && (
              <section>
                <h3 className="font-heading text-base font-medium text-foreground mb-2">Interests</h3>
                <div className="flex flex-wrap gap-2">
                  {currentUser.interests.map((interest) => (
                    <span key={interest} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-border text-sm text-foreground">
                      {INTEREST_EMOJIS[interest] || "🌟"} {interest}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Family Values */}
            {currentUser?.familyValues && currentUser.familyValues.length > 0 && (
              <section>
                <h3 className="font-heading text-base font-medium text-foreground mb-2">Values</h3>
                <div className="flex flex-wrap gap-2">
                  {currentUser.familyValues.map((value) => (
                    <span key={value} className="px-3 py-1.5 rounded-full border border-border text-sm text-foreground">{value}</span>
                  ))}
                </div>
              </section>
            )}

            {/* Languages */}
            {currentUser?.languages && currentUser.languages.length > 0 && (
              <section>
                <h3 className="font-heading text-base font-medium text-foreground mb-2 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  Languages
                </h3>
                <div className="flex flex-wrap gap-2">
                  {currentUser.languages.map((lang) => (
                    <span key={lang} className="px-3 py-1.5 rounded-full border border-border text-sm text-foreground">{lang}</span>
                  ))}
                </div>
              </section>
            )}

            {/* Pets */}
            {currentUser?.pets && (
              <section>
                <h3 className="font-heading text-base font-medium text-foreground mb-1">🐾 Pets</h3>
                <p className="text-sm text-muted-foreground">{currentUser.pets}</p>
              </section>
            )}

            {/* Family Motto */}
            {currentUser?.familyMotto && (
              <section>
                <h3 className="font-heading text-base font-medium text-foreground mb-1">Family Motto</h3>
                <p className="text-sm text-muted-foreground italic">"{currentUser.familyMotto}"</p>
              </section>
            )}

            {/* Dream Vacation */}
            {currentUser?.dreamVacation && (
              <section>
                <h3 className="font-heading text-base font-medium text-foreground mb-1 flex items-center gap-2">
                  <Plane className="h-4 w-4 text-muted-foreground" />
                  Dream Vacation
                </h3>
                <p className="text-sm text-muted-foreground">{currentUser.dreamVacation}</p>
              </section>
            )}

            {/* Badges */}
            {userBadges.length > 0 && (
              <section>
                <h3 className="font-heading text-base font-medium text-foreground mb-2">Badges</h3>
                <div className="flex flex-wrap gap-2">
                  {userBadges.map((badge: any) => (
                    <span key={badge.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-sm text-foreground">
                      {BADGE_ICONS[badge.badge?.name || ''] || '🏅'} {badge.badge?.name || 'Badge'}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Pods */}
            {pods.length > 0 && (
              <section>
                <h3 className="font-heading text-base font-medium text-foreground mb-2">Pods</h3>
                <div className="space-y-3">
                  {pods.map((pod) => (
                    <PodCard key={pod.id} pod={pod} />
                  ))}
                </div>
              </section>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Followers/Following Sheet */}
      <Sheet open={followSheet !== null} onOpenChange={(open) => { if (!open) { setFollowSheet(null); setFollowSearch(""); } }}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>{followSheet === "followers" ? "Followers" : "Following"}</SheetTitle>
          </SheetHeader>
          <div className="px-4 pt-3 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name..."
                value={followSearch}
                onChange={(e) => setFollowSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-full border border-border bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 px-4 pb-4">
            {(() => {
              const list = followSheet === "followers" ? followersData : followingData;
              const filtered = list.filter((u: any) =>
                (u.name || "").toLowerCase().includes(followSearch.toLowerCase())
              );
              if (filtered.length === 0) {
                return (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {followSearch
                      ? "No results found"
                      : followSheet === "followers"
                        ? "No followers yet"
                        : "Not following anyone yet"}
                  </p>
                );
              }
              return filtered.map((user: any) => (
                <button
                  key={user.id}
                  onClick={() => { setFollowSheet(null); setFollowSearch(""); setLocation(`/family-profile/${user.id}`); }}
                  className="flex items-center gap-3 w-full py-3 border-b border-border/50 last:border-0 text-left hover:bg-muted/30 rounded-lg px-2 transition-colors"
                >
                  {user.avatar || user.profileImageUrl ? (
                    <img
                      src={user.avatar || user.profileImageUrl}
                      alt={user.name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
                      {(user.name || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                    {user.location && (
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {user.location}
                      </p>
                    )}
                  </div>
                </button>
              ));
            })()}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function AddMemberModal({
  showModal,
  setShowModal,
  newMember,
  setNewMember,
  addMemberMutation
}: {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  newMember: { name: string; role: string; ageGroup: string; isAdult: boolean; photo: string };
  setNewMember: (member: { name: string; role: string; ageGroup: string; isAdult: boolean; photo: string }) => void;
  addMemberMutation: any;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center">
      <div className="bg-background rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto animate-slide-up mb-20 sm:mb-0 mx-4">
        <div className="sticky top-0 bg-background border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 className="font-heading text-xl font-medium">Add Crew Member</h2>
          <button
            onClick={() => {
              setShowModal(false);
              setNewMember({ name: "", role: "", ageGroup: "", isAdult: true, photo: "" });
            }}
            className="p-2 rounded-full bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex justify-center">
            <ImageUpload
              currentImage={newMember.photo}
              onImageChange={(url) => setNewMember({ ...newMember, photo: url })}
              size="md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Name</label>
            <input
              type="text"
              value={newMember.name}
              onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
              className="w-full rounded-xl border border-border bg-background p-4 text-base focus:border-foreground focus:outline-none"
              placeholder="e.g., Emma"
              data-testid="input-member-name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Role (Adults)</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {FAMILY_ROLES.adults.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setNewMember({ ...newMember, role, isAdult: true })}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-all border",
                    newMember.role === role
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background text-muted-foreground border-border"
                  )}
                  data-testid={`button-role-${role.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {role}
                </button>
              ))}
            </div>
            <label className="block text-sm font-medium text-foreground mb-2">Role (Kids)</label>
            <div className="flex flex-wrap gap-2">
              {FAMILY_ROLES.kids.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setNewMember({ ...newMember, role, isAdult: false })}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-all border",
                    newMember.role === role
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background text-muted-foreground border-border"
                  )}
                  data-testid={`button-role-${role.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Age Group</label>
            <div className="flex flex-wrap gap-2">
              {AGE_GROUPS.map((age) => (
                <button
                  key={age}
                  type="button"
                  onClick={() => setNewMember({ ...newMember, ageGroup: age })}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-all border",
                    newMember.ageGroup === age
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background text-muted-foreground border-border"
                  )}
                  data-testid={`button-age-${age.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {age}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => addMemberMutation.mutate()}
            disabled={!newMember.name || !newMember.role || addMemberMutation.isPending}
            className="w-full py-3.5 bg-foreground text-background font-medium rounded-full disabled:opacity-50"
            data-testid="button-submit-member"
          >
            {addMemberMutation.isPending ? "Adding..." : "Add Crew Member"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  return <ProfileInner />;
}
