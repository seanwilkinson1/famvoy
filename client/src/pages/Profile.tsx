import { ExperienceCard } from "@/components/shared/ExperienceCard";
import { PodCard } from "@/components/shared/PodCard";
import { ImageUpload } from "@/components/shared/ImageUpload";
import { GooglePlacesAutocomplete } from "@/components/shared/GooglePlacesAutocomplete";
import { Settings as SettingsIcon, MapPin, Edit2, X, Check, Award, Trophy, CheckCircle, Star, Heart, Globe, Quote, Plane, Users, Share2, UserPlus, ChevronLeft } from "lucide-react";
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

const INTEREST_OPTIONS = [
  "Hiking", "Beach", "Parks", "Museums", "Playgrounds", "Sports", 
  "Art", "Music", "Cooking", "Reading", "Travel", "Camping", 
  "Biking", "Swimming", "Dance", "Food", "Nature", "Science"
];

function ProfileInner() {
  const [activeTab, setActiveTab] = useState<"experiences" | "about" | "saved" | "trips">("experiences");
  const [isEditing, setIsEditing] = useState(false);
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

  const { data: followersCount = 0 } = useQuery({
    queryKey: ["followersCount", currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return 0;
      const followers = await api.follows.getFollowers(currentUser.id);
      return followers.length;
    },
    enabled: !!currentUser,
  });

  const { data: followingCount = 0 } = useQuery({
    queryKey: ["followingCount", currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return 0;
      const following = await api.follows.getFollowing(currentUser.id);
      return following.length;
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

  const adultMembers = familyMembers.filter(m => m.isAdult);
  const kidMembers = familyMembers.filter(m => !m.isAdult);

  const formattedUserExperiences = userExperiences.map(exp => formatExperience(exp as any));
  const formattedSavedExperiences = savedExperiences.map(exp => formatExperience(exp as any));

  const userLocation = currentUser?.locationLat && currentUser?.locationLng
    ? { lat: currentUser.locationLat, lng: currentUser.locationLng }
    : null;

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
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-full font-bold text-sm"
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
            <label className="block text-sm font-bold text-foreground mb-2">Family Name</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full rounded-xl border border-border bg-white p-4 text-base font-medium focus:border-primary focus:outline-none"
              placeholder="Your family name"
              data-testid="input-edit-name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-foreground mb-2">Location</label>
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
            <label className="block text-sm font-bold text-foreground mb-2">Kids</label>
            <input
              type="text"
              value={editForm.kids}
              onChange={(e) => setEditForm({ ...editForm, kids: e.target.value })}
              className="w-full rounded-xl border border-border bg-white p-4 text-base font-medium focus:border-primary focus:outline-none"
              placeholder="e.g., 2 Kids (ages 3 & 7)"
              data-testid="input-edit-kids"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-foreground mb-2">Bio</label>
            <textarea
              value={editForm.bio}
              onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
              className="w-full rounded-xl border border-border bg-white p-4 text-base font-medium focus:border-primary focus:outline-none resize-none"
              rows={3}
              placeholder="Tell other families about you..."
              data-testid="input-edit-bio"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-foreground mb-2">Interests</label>
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((interest) => (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  style={{
                    backgroundColor: editForm.interests.includes(interest) ? '#14b8a6' : '#f3f4f6',
                    color: editForm.interests.includes(interest) ? 'white' : '#6b7280',
                  }}
                  className="rounded-full px-4 py-2 text-sm font-bold transition-all"
                  data-testid={`button-interest-${interest.toLowerCase()}`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-foreground mb-2">
              <Heart className="inline-block h-4 w-4 mr-1 text-rose-500" />
              Family Values
            </label>
            <div className="flex flex-wrap gap-2">
              {FAMILY_VALUES.map((value) => (
                <button
                  key={value}
                  onClick={() => toggleFamilyValue(value)}
                  style={{
                    backgroundColor: editForm.familyValues.includes(value) ? '#f43f5e' : '#f3f4f6',
                    color: editForm.familyValues.includes(value) ? 'white' : '#6b7280',
                  }}
                  className="rounded-full px-4 py-2 text-sm font-bold transition-all"
                  data-testid={`button-value-${value.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-foreground mb-2">
              <Globe className="inline-block h-4 w-4 mr-1 text-blue-500" />
              Languages We Speak
            </label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((language) => (
                <button
                  key={language}
                  onClick={() => toggleLanguage(language)}
                  style={{
                    backgroundColor: editForm.languages.includes(language) ? '#3b82f6' : '#f3f4f6',
                    color: editForm.languages.includes(language) ? 'white' : '#6b7280',
                  }}
                  className="rounded-full px-4 py-2 text-sm font-bold transition-all"
                  data-testid={`button-language-${language.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {language}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-foreground mb-2">
              🐾 Pets
            </label>
            <input
              type="text"
              value={editForm.pets}
              onChange={(e) => setEditForm({ ...editForm, pets: e.target.value })}
              className="w-full rounded-xl border border-border bg-white p-4 text-base font-medium focus:border-primary focus:outline-none"
              placeholder="e.g., Dog named Max, 2 cats"
              data-testid="input-edit-pets"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-foreground mb-2">
              <Quote className="inline-block h-4 w-4 mr-1 text-purple-500" />
              Family Motto
            </label>
            <input
              type="text"
              value={editForm.familyMotto}
              onChange={(e) => setEditForm({ ...editForm, familyMotto: e.target.value })}
              className="w-full rounded-xl border border-border bg-white p-4 text-base font-medium focus:border-primary focus:outline-none"
              placeholder="e.g., Adventure awaits!"
              data-testid="input-edit-motto"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-foreground mb-2">
              <Star className="inline-block h-4 w-4 mr-1 text-amber-500" />
              Favorite Traditions
            </label>
            <textarea
              value={editForm.favoriteTraditions}
              onChange={(e) => setEditForm({ ...editForm, favoriteTraditions: e.target.value })}
              className="w-full rounded-xl border border-border bg-white p-4 text-base font-medium focus:border-primary focus:outline-none resize-none"
              rows={2}
              placeholder="e.g., Sunday pancakes, Friday movie nights"
              data-testid="input-edit-traditions"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-foreground mb-2">
              <Plane className="inline-block h-4 w-4 mr-1 text-kindred-green" />
              Dream Vacation
            </label>
            <input
              type="text"
              value={editForm.dreamVacation}
              onChange={(e) => setEditForm({ ...editForm, dreamVacation: e.target.value })}
              className="w-full rounded-xl border border-border bg-white p-4 text-base font-medium focus:border-primary focus:outline-none"
              placeholder="e.g., Disney World, Japan"
              data-testid="input-edit-dream-vacation"
            />
          </div>

          <div className="border-t border-border pt-6">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-bold text-foreground">
                <Users className="inline-block h-4 w-4 mr-1 text-primary" />
                Family Members
              </label>
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-sm font-bold rounded-full"
                data-testid="button-add-member"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>

            {familyMembers.length === 0 ? (
              <div className="text-center py-8 bg-muted rounded-xl border-2 border-dashed border-border">
                <UserPlus className="h-8 w-8 text-border mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No family members added yet</p>
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="mt-2 text-sm text-primary font-bold"
                >
                  Add your first family member
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {familyMembers.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-border">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex-shrink-0">
                      {member.photo ? (
                        <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg bg-gradient-to-br from-primary/20 to-primary/40">
                          {member.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground truncate">{member.name}</p>
                      <p className="text-xs text-primary">{member.role}</p>
                      {member.ageGroup && (
                        <p className="text-xs text-muted-foreground">{member.ageGroup}</p>
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-8 md:max-w-5xl md:mx-auto md:px-8">
      {/* Top bar with Edit/Settings */}
      <div className="flex justify-between items-center px-6 pt-16 md:pt-8 pb-2">
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-edit-profile"
        >
          <Edit2 className="h-4 w-4" />
          Edit
        </button>
        <button
          onClick={() => setLocation("/settings")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-settings"
        >
          <SettingsIcon className="h-4 w-4" />
          Settings
        </button>
      </div>

      {/* Light Profile Hero */}
      <div className="px-6 py-6">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <img
            src={currentUser?.avatar || currentUser?.profileImageUrl || "https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=400"}
            alt="Profile"
            className="h-24 w-24 rounded-full object-cover ring-4 ring-white shadow-lg shrink-0"
            data-testid="img-avatar"
          />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="font-heading text-2xl font-bold text-foreground" data-testid="text-username">
              {currentUser?.name || "Loading..."}
            </h1>
            <p className="text-muted-foreground text-sm">
              @{(currentUser?.name || "family").toLowerCase().replace(/\s+/g, '')}
            </p>

            {/* Followers/Following */}
            <div className="flex items-center gap-4 mt-2">
              <button
                className="text-sm"
                onClick={() => {}}
                data-testid="button-following"
              >
                <span className="text-foreground font-bold">{followingCount}</span>
                <span className="text-muted-foreground ml-1">following</span>
              </button>
              <button
                className="text-sm"
                onClick={() => {}}
                data-testid="button-followers"
              >
                <span className="text-foreground font-bold">{followersCount}</span>
                <span className="text-muted-foreground ml-1">followers</span>
              </button>
            </div>

            {/* Location chip */}
            {currentUser?.location && (
              <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span>{currentUser.location}</span>
              </div>
            )}

            {/* Bio */}
            {currentUser?.bio && (
              <p className="text-muted-foreground text-sm mt-2 max-w-md">{currentUser.bio}</p>
            )}
          </div>
        </div>

        {/* Travel Stats Card */}
        <div className="mt-6 bg-white border border-border shadow-sm rounded-2xl p-4">
          {!travelStats || travelStats.totalTrips === 0 ? (
            <div className="flex items-center justify-around">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{userTrips.length}</p>
                <p className="text-muted-foreground text-xs">Trips</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{userCheckins.length}</p>
                <p className="text-muted-foreground text-xs">Experiences</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{userBadges.length}</p>
                <p className="text-muted-foreground text-xs">Badges</p>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-around">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{travelStats.totalTrips}</p>
                  <p className="text-muted-foreground text-xs">Trips</p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{travelStats.totalDays}</p>
                  <p className="text-muted-foreground text-xs">Days</p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{travelStats.destinationsVisited}</p>
                  <p className="text-muted-foreground text-xs">Destinations</p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{travelStats.photosCapured}</p>
                  <p className="text-muted-foreground text-xs">Photos</p>
                </div>
              </div>
              {travelStats.favoriteTrip && travelStats.favoriteTrip.rating && (
                <div className="mt-3 pt-3 border-t border-border text-center">
                  <p className="text-muted-foreground text-xs">Favorite Trip</p>
                  <p className="text-foreground text-sm font-medium">{travelStats.favoriteTrip.name}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex gap-3">
          <button
            onClick={handleShareProfile}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-border rounded-xl text-foreground font-medium text-sm hover:bg-muted transition-colors"
            data-testid="button-share-profile"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
          <button
            onClick={() => {}}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-border rounded-xl text-foreground font-medium text-sm hover:bg-muted transition-colors"
            data-testid="button-invite-friends"
          >
            <UserPlus className="h-4 w-4" />
            Invite
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 bg-white sticky top-14 z-20 border-b border-border">
        <div className="flex">
          {[
            { id: "experiences", label: "Experiences" },
            { id: "about", label: "About" },
            { id: "saved", label: "Saved" },
            { id: "trips", label: "Trips" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex-1 py-4 text-sm font-bold transition-all border-b-2",
                activeTab === tab.id
                  ? "text-primary border-primary"
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
      <div className="px-6 py-6 animate-in fade-in duration-300">
        {activeTab === "experiences" && (
          <div>
            {formattedUserExperiences.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-8 w-8 text-border" />
                </div>
                <p className="text-muted-foreground font-medium">No experiences shared yet</p>
                <p className="text-muted-foreground text-sm mt-1">Share your first family adventure!</p>
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

        {activeTab === "about" && (
          <div className="space-y-6">
            {/* Bio */}
            {currentUser?.bio && (
              <div>
                <p className="text-foreground">{currentUser.bio}</p>
              </div>
            )}

            {/* Kids info */}
            {currentUser?.kids && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4 text-primary" />
                <span>{currentUser.kids}</span>
              </div>
            )}

            {/* Location */}
            {currentUser?.location && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                <span>{currentUser.location}</span>
              </div>
            )}

            {/* Family Members */}
            {familyMembers.length > 0 && (
              <div>
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Family Members
                </h3>
                
                {adultMembers.length > 0 && (
                  <div className="mb-4">
                    <span className="inline-block px-3 py-1 text-xs font-bold bg-primary/10 text-primary rounded-full mb-3">
                      Adults
                    </span>
                    <div className="flex flex-wrap gap-4">
                      {adultMembers.map((member) => (
                        <div key={member.id} className="flex flex-col items-center" data-testid={`family-member-${member.id}`}>
                          <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-gray-200 bg-muted">
                            {member.photo ? (
                              <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xl bg-gradient-to-br from-primary/20 to-primary/40">
                                {member.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <p className="mt-1 text-sm font-bold text-foreground">{member.name}</p>
                          <p className="text-xs text-primary font-medium">{member.role}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {kidMembers.length > 0 && (
                  <div>
                    <span className="inline-block px-3 py-1 text-xs font-bold bg-secondary/20 text-secondary-foreground rounded-full mb-3">
                      Kids
                    </span>
                    <div className="flex flex-wrap gap-4">
                      {kidMembers.map((member) => (
                        <div key={member.id} className="flex flex-col items-center" data-testid={`family-member-${member.id}`}>
                          <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-gray-200 bg-muted">
                            {member.photo ? (
                              <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xl bg-gradient-to-br from-secondary/20 to-secondary/40">
                                {member.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <p className="mt-1 text-sm font-bold text-foreground">{member.name}</p>
                          <p className="text-xs text-secondary font-medium">{member.role}</p>
                          {member.ageGroup && (
                            <p className="text-xs text-muted-foreground">{member.ageGroup}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Interests */}
            {currentUser?.interests && currentUser.interests.length > 0 && (
              <div>
                <h3 className="font-bold text-foreground mb-3">Interests</h3>
                <div className="flex flex-wrap gap-2">
                  {currentUser.interests.map((interest) => (
                    <span
                      key={interest}
                      className="px-3 py-1.5 bg-primary/10 text-primary text-sm rounded-full font-medium"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Family Values */}
            {currentUser?.familyValues && currentUser.familyValues.length > 0 && (
              <div>
                <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                  <Heart className="h-4 w-4 text-rose-500" />
                  Family Values
                </h3>
                <div className="flex flex-wrap gap-2">
                  {currentUser.familyValues.map((value) => (
                    <span key={value} className="px-3 py-1.5 bg-rose-50 text-rose-700 text-sm rounded-full font-medium">
                      {value}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Languages */}
            {currentUser?.languages && currentUser.languages.length > 0 && (
              <div>
                <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-500" />
                  Languages
                </h3>
                <div className="flex flex-wrap gap-2">
                  {currentUser.languages.map((lang) => (
                    <span key={lang} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-full font-medium">
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Pets */}
            {currentUser?.pets && (
              <div>
                <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
                  <span>🐾</span>
                  Pets
                </h3>
                <p className="text-muted-foreground">{currentUser.pets}</p>
              </div>
            )}

            {/* Family Motto */}
            {currentUser?.familyMotto && (
              <div>
                <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
                  <Quote className="h-4 w-4 text-purple-500" />
                  Family Motto
                </h3>
                <p className="text-muted-foreground italic">"{currentUser.familyMotto}"</p>
              </div>
            )}

            {/* Favorite Traditions */}
            {currentUser?.favoriteTraditions && (
              <div>
                <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  Favorite Traditions
                </h3>
                <p className="text-muted-foreground">{currentUser.favoriteTraditions}</p>
              </div>
            )}

            {/* Dream Vacation */}
            {currentUser?.dreamVacation && (
              <div>
                <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
                  <Plane className="h-4 w-4 text-kindred-green" />
                  Dream Vacation
                </h3>
                <p className="text-muted-foreground">{currentUser.dreamVacation}</p>
              </div>
            )}

            {/* Badges */}
            {userBadges.length > 0 && (
              <div>
                <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" />
                  Badges
                </h3>
                <div className="flex flex-wrap gap-3">
                  {userBadges.map((badge: any) => (
                    <div
                      key={badge.id}
                      className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-xl"
                      data-testid={`badge-${badge.id}`}
                    >
                      <span className="text-xl">{BADGE_ICONS[badge.badge?.name || ''] || '🏅'}</span>
                      <span className="text-sm font-medium text-amber-800">{badge.badge?.name || 'Badge'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pods */}
            {pods.length > 0 && (
              <div>
                <h3 className="font-bold text-foreground mb-3">Pods</h3>
                <div className="space-y-3">
                  {pods.map((pod) => (
                    <PodCard key={pod.id} pod={pod} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "saved" && (
          <div>
            {formattedSavedExperiences.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="h-8 w-8 text-border" />
                </div>
                <p className="text-muted-foreground font-medium">No saved experiences yet</p>
                <p className="text-muted-foreground text-sm mt-1">Save experiences you want to try!</p>
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

        {activeTab === "trips" && (
          <div className="space-y-4">
            {userTrips.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plane className="h-8 w-8 text-border" />
                </div>
                <p className="text-muted-foreground font-medium">No trips planned yet</p>
                <p className="text-muted-foreground text-sm mt-1">Join a pod and start planning your first trip!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {userTrips.map((trip: any) => (
                  <div 
                    key={trip.id}
                    className="rounded-xl bg-white p-4 shadow-sm border border-border cursor-pointer"
                    onClick={() => setLocation(`/trip/${trip.id}`)}
                    data-testid={`trip-card-${trip.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Plane className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="font-bold text-foreground line-clamp-1">{trip.name}</h4>
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full font-medium shrink-0",
                            trip.status === "confirmed" 
                              ? "bg-green-100 text-green-700" 
                              : trip.status === "confirming"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-muted text-muted-foreground"
                          )}>
                            {trip.status === "confirmed" ? "Confirmed" : trip.status === "confirming" ? "In Progress" : "Draft"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>{trip.destination}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                        </p>
                        {trip.pod && (
                          <p className="text-xs text-primary mt-1 font-medium">
                            {trip.pod.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
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
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto animate-slide-up mb-20 sm:mb-0 mx-4">
        <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 className="font-heading text-xl font-bold">Add Family Member</h2>
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
            <label className="block text-sm font-bold text-foreground mb-2">Name</label>
            <input
              type="text"
              value={newMember.name}
              onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
              className="w-full rounded-xl border border-border bg-white p-4 text-base font-medium focus:border-primary focus:outline-none"
              placeholder="e.g., Emma"
              data-testid="input-member-name"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-foreground mb-2">Role (Adults)</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {FAMILY_ROLES.adults.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setNewMember({ ...newMember, role, isAdult: true })}
                  style={{
                    backgroundColor: newMember.role === role ? '#14b8a6' : '#f3f4f6',
                    color: newMember.role === role ? 'white' : '#6b7280',
                  }}
                  className="rounded-full px-4 py-2 text-sm font-bold transition-all"
                  data-testid={`button-role-${role.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {role}
                </button>
              ))}
            </div>
            <label className="block text-sm font-bold text-foreground mb-2">Role (Kids)</label>
            <div className="flex flex-wrap gap-2">
              {FAMILY_ROLES.kids.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setNewMember({ ...newMember, role, isAdult: false })}
                  style={{
                    backgroundColor: newMember.role === role ? '#14b8a6' : '#f3f4f6',
                    color: newMember.role === role ? 'white' : '#6b7280',
                  }}
                  className="rounded-full px-4 py-2 text-sm font-bold transition-all"
                  data-testid={`button-role-${role.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-foreground mb-2">Age Group</label>
            <div className="flex flex-wrap gap-2">
              {AGE_GROUPS.map((age) => (
                <button
                  key={age}
                  type="button"
                  onClick={() => setNewMember({ ...newMember, ageGroup: age })}
                  style={{
                    backgroundColor: newMember.ageGroup === age ? '#14b8a6' : '#f3f4f6',
                    color: newMember.ageGroup === age ? 'white' : '#6b7280',
                  }}
                  className="rounded-full px-4 py-2 text-sm font-bold transition-all"
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
            className="w-full py-4 bg-primary text-white font-bold rounded-xl disabled:opacity-50"
            data-testid="button-submit-member"
          >
            {addMemberMutation.isPending ? "Adding..." : "Add Family Member"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  return <ProfileInner />;
}
