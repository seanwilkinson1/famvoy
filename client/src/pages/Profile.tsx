import { ExperienceCard } from "@/components/shared/ExperienceCard";
import { PodCard } from "@/components/shared/PodCard";
import { ImageUpload } from "@/components/shared/ImageUpload";
import { GooglePlacesAutocomplete } from "@/components/shared/GooglePlacesAutocomplete";
import { ExploreMap } from "@/components/shared/ExploreMap";
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

export default function Profile() {
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
      <div className="min-h-screen bg-background pt-14 pb-32 px-6">
        <div className="mb-6 flex justify-between">
          <button
            onClick={() => setIsEditing(false)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
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
            <p className="text-xs text-gray-500 mt-2">Tap to change photo</p>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Family Name</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-white p-4 text-base font-medium focus:border-primary focus:outline-none"
              placeholder="Your family name"
              data-testid="input-edit-name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Location</label>
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
            <label className="block text-sm font-bold text-gray-700 mb-2">Kids</label>
            <input
              type="text"
              value={editForm.kids}
              onChange={(e) => setEditForm({ ...editForm, kids: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-white p-4 text-base font-medium focus:border-primary focus:outline-none"
              placeholder="e.g., 2 Kids (ages 3 & 7)"
              data-testid="input-edit-kids"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Bio</label>
            <textarea
              value={editForm.bio}
              onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-white p-4 text-base font-medium focus:border-primary focus:outline-none resize-none"
              rows={3}
              placeholder="Tell other families about you..."
              data-testid="input-edit-bio"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Interests</label>
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
            <label className="block text-sm font-bold text-gray-700 mb-2">
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
            <label className="block text-sm font-bold text-gray-700 mb-2">
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
            <label className="block text-sm font-bold text-gray-700 mb-2">
              🐾 Pets
            </label>
            <input
              type="text"
              value={editForm.pets}
              onChange={(e) => setEditForm({ ...editForm, pets: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-white p-4 text-base font-medium focus:border-primary focus:outline-none"
              placeholder="e.g., Dog named Max, 2 cats"
              data-testid="input-edit-pets"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <Quote className="inline-block h-4 w-4 mr-1 text-purple-500" />
              Family Motto
            </label>
            <input
              type="text"
              value={editForm.familyMotto}
              onChange={(e) => setEditForm({ ...editForm, familyMotto: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-white p-4 text-base font-medium focus:border-primary focus:outline-none"
              placeholder="e.g., Adventure awaits!"
              data-testid="input-edit-motto"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <Star className="inline-block h-4 w-4 mr-1 text-amber-500" />
              Favorite Traditions
            </label>
            <textarea
              value={editForm.favoriteTraditions}
              onChange={(e) => setEditForm({ ...editForm, favoriteTraditions: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-white p-4 text-base font-medium focus:border-primary focus:outline-none resize-none"
              rows={2}
              placeholder="e.g., Sunday pancakes, Friday movie nights"
              data-testid="input-edit-traditions"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <Plane className="inline-block h-4 w-4 mr-1 text-teal-500" />
              Dream Vacation
            </label>
            <input
              type="text"
              value={editForm.dreamVacation}
              onChange={(e) => setEditForm({ ...editForm, dreamVacation: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-white p-4 text-base font-medium focus:border-primary focus:outline-none"
              placeholder="e.g., Disney World, Japan"
              data-testid="input-edit-dream-vacation"
            />
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-bold text-gray-700">
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
              <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <UserPlus className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No family members added yet</p>
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
                  <div key={member.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                      {member.photo ? (
                        <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg bg-gradient-to-br from-primary/20 to-primary/40">
                          {member.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{member.name}</p>
                      <p className="text-xs text-primary">{member.role}</p>
                      {member.ageGroup && (
                        <p className="text-xs text-gray-400">{member.ageGroup}</p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteMemberMutation.mutate(member.id)}
                      disabled={deleteMemberMutation.isPending}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
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
    <div className="min-h-screen bg-background pb-32">
      {/* Map Header - 30% viewport height */}
      <div className="relative h-[30vh] min-h-[200px]">
        <ExploreMap
          experiences={[]}
          userLocation={userLocation}
          className="h-full w-full"
        />
        
        {/* Top controls overlay */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10 pt-10">
          <button
            onClick={() => setIsEditing(true)}
            className="rounded-full bg-white/90 backdrop-blur-sm p-2 shadow-lg"
            data-testid="button-edit-profile"
          >
            <Edit2 className="h-5 w-5 text-gray-700" />
          </button>
          <button
            onClick={() => setLocation("/settings")}
            className="rounded-full bg-white/90 backdrop-blur-sm p-2 shadow-lg"
            data-testid="button-settings"
          >
            <SettingsIcon className="h-5 w-5 text-gray-700" />
          </button>
        </div>

        {/* Pinned location chip */}
        {currentUser?.location && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/90 backdrop-blur-sm rounded-full text-white text-sm font-medium">
              <MapPin className="h-4 w-4 text-primary" />
              Pinned location
            </div>
          </div>
        )}
      </div>

      {/* Dark Profile Info Section */}
      <div className="bg-gray-900 px-6 py-6">
        <div className="flex items-start justify-between">
          {/* Left side - Name and info */}
          <div className="flex-1">
            <h1 className="font-heading text-2xl font-bold text-white" data-testid="text-username">
              {currentUser?.name || "Loading..."}
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">
              @{(currentUser?.name || "family").toLowerCase().replace(/\s+/g, '')}
            </p>
            
            {/* Followers/Following */}
            <div className="flex items-center gap-4 mt-3">
              <button 
                className="text-sm"
                onClick={() => {}}
                data-testid="button-following"
              >
                <span className="text-white font-bold">{followingCount}</span>
                <span className="text-gray-400 ml-1">following</span>
              </button>
              <button 
                className="text-sm"
                onClick={() => {}}
                data-testid="button-followers"
              >
                <span className="text-white font-bold">{followersCount}</span>
                <span className="text-gray-400 ml-1">followers</span>
              </button>
            </div>
          </div>

          {/* Right side - Avatar with flag */}
          <div className="relative">
            <img
              src={currentUser?.avatar || currentUser?.profileImageUrl || "https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=400"}
              alt="Profile"
              className="h-20 w-20 rounded-full object-cover ring-4 ring-gray-700"
              data-testid="img-avatar"
            />
            {currentUser?.location && (
              <div className="absolute -bottom-1 -right-1 text-xl">
                🇺🇸
              </div>
            )}
          </div>
        </div>

        {/* Trip Stats Card */}
        <div className="mt-6 bg-gray-800 rounded-xl p-4">
          {userTrips.length === 0 ? (
            <div className="text-center">
              <p className="text-white font-bold">No trip stats yet</p>
              <p className="text-gray-400 text-sm mt-1">Track or post trips to log miles and get badges</p>
            </div>
          ) : (
            <div className="flex items-center justify-around">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{userTrips.length}</p>
                <p className="text-gray-400 text-xs">Trips</p>
              </div>
              <div className="w-px h-8 bg-gray-700" />
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{userCheckins.length}</p>
                <p className="text-gray-400 text-xs">Experiences</p>
              </div>
              <div className="w-px h-8 bg-gray-700" />
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{userBadges.length}</p>
                <p className="text-gray-400 text-xs">Badges</p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex gap-3">
          <button
            onClick={handleShareProfile}
            className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-gray-600 rounded-xl text-white font-bold text-sm hover:bg-gray-800 transition-colors"
            data-testid="button-share-profile"
          >
            <Share2 className="h-4 w-4" />
            Share profile
          </button>
          <button
            onClick={() => {}}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary rounded-xl text-white font-bold text-sm hover:bg-primary/90 transition-colors"
            data-testid="button-invite-friends"
          >
            <UserPlus className="h-4 w-4" />
            Invite friends
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white sticky top-14 z-20 border-b border-gray-200">
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
                  : "text-gray-500 border-transparent hover:text-gray-700"
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
          <div className="space-y-4">
            {formattedUserExperiences.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-8 w-8 text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium">No experiences shared yet</p>
                <p className="text-gray-400 text-sm mt-1">Share your first family adventure!</p>
              </div>
            ) : (
              [...formattedUserExperiences].reverse().map((exp) => (
                <ExperienceCard key={exp.id} experience={exp} />
              ))
            )}
          </div>
        )}

        {activeTab === "about" && (
          <div className="space-y-6">
            {/* Bio */}
            {currentUser?.bio && (
              <div>
                <p className="text-gray-700">{currentUser.bio}</p>
              </div>
            )}

            {/* Kids info */}
            {currentUser?.kids && (
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="h-4 w-4 text-primary" />
                <span>{currentUser.kids}</span>
              </div>
            )}

            {/* Location */}
            {currentUser?.location && (
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="h-4 w-4 text-primary" />
                <span>{currentUser.location}</span>
              </div>
            )}

            {/* Family Members */}
            {familyMembers.length > 0 && (
              <div>
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
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
                          <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-gray-200 bg-gray-100">
                            {member.photo ? (
                              <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xl bg-gradient-to-br from-primary/20 to-primary/40">
                                {member.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <p className="mt-1 text-sm font-bold text-gray-900">{member.name}</p>
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
                          <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-gray-200 bg-gray-100">
                            {member.photo ? (
                              <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xl bg-gradient-to-br from-secondary/20 to-secondary/40">
                                {member.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <p className="mt-1 text-sm font-bold text-gray-900">{member.name}</p>
                          <p className="text-xs text-secondary font-medium">{member.role}</p>
                          {member.ageGroup && (
                            <p className="text-xs text-gray-400">{member.ageGroup}</p>
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
                <h3 className="font-bold text-gray-900 mb-3">Interests</h3>
                <div className="flex flex-wrap gap-2">
                  {currentUser.interests.map((interest) => (
                    <span
                      key={interest}
                      className="px-3 py-1.5 bg-gray-800 text-white text-sm rounded-full font-medium"
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
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
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
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
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
                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span>🐾</span>
                  Pets
                </h3>
                <p className="text-gray-600">{currentUser.pets}</p>
              </div>
            )}

            {/* Family Motto */}
            {currentUser?.familyMotto && (
              <div>
                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Quote className="h-4 w-4 text-purple-500" />
                  Family Motto
                </h3>
                <p className="text-gray-600 italic">"{currentUser.familyMotto}"</p>
              </div>
            )}

            {/* Favorite Traditions */}
            {currentUser?.favoriteTraditions && (
              <div>
                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  Favorite Traditions
                </h3>
                <p className="text-gray-600">{currentUser.favoriteTraditions}</p>
              </div>
            )}

            {/* Dream Vacation */}
            {currentUser?.dreamVacation && (
              <div>
                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Plane className="h-4 w-4 text-teal-500" />
                  Dream Vacation
                </h3>
                <p className="text-gray-600">{currentUser.dreamVacation}</p>
              </div>
            )}

            {/* Badges */}
            {userBadges.length > 0 && (
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
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
                <h3 className="font-bold text-gray-900 mb-3">Pods</h3>
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
          <div className="space-y-4">
            {formattedSavedExperiences.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="h-8 w-8 text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium">No saved experiences yet</p>
                <p className="text-gray-400 text-sm mt-1">Save experiences you want to try!</p>
              </div>
            ) : (
              [...formattedSavedExperiences].reverse().map((exp) => (
                <ExperienceCard key={exp.id} experience={exp} />
              ))
            )}
          </div>
        )}

        {activeTab === "trips" && (
          <div className="space-y-4">
            {userTrips.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plane className="h-8 w-8 text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium">No trips planned yet</p>
                <p className="text-gray-400 text-sm mt-1">Join a pod and start planning your first trip!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {userTrips.map((trip: any) => (
                  <div 
                    key={trip.id}
                    className="rounded-xl bg-white p-4 shadow-sm border border-gray-100 cursor-pointer"
                    onClick={() => setLocation(`/trip/${trip.id}`)}
                    data-testid={`trip-card-${trip.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Plane className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="font-bold text-gray-900 line-clamp-1">{trip.name}</h4>
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full font-medium shrink-0",
                            trip.status === "confirmed" 
                              ? "bg-green-100 text-green-700" 
                              : trip.status === "confirming"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-gray-100 text-gray-600"
                          )}>
                            {trip.status === "confirmed" ? "Confirmed" : trip.status === "confirming" ? "In Progress" : "Draft"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <MapPin className="h-3 w-3" />
                          <span>{trip.destination}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
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
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="font-heading text-xl font-bold">Add Family Member</h2>
          <button
            onClick={() => {
              setShowModal(false);
              setNewMember({ name: "", role: "", ageGroup: "", isAdult: true, photo: "" });
            }}
            className="p-2 rounded-full bg-gray-100"
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
            <label className="block text-sm font-bold text-gray-700 mb-2">Name</label>
            <input
              type="text"
              value={newMember.name}
              onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-white p-4 text-base font-medium focus:border-primary focus:outline-none"
              placeholder="e.g., Emma"
              data-testid="input-member-name"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Role (Adults)</label>
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
            <label className="block text-sm font-bold text-gray-700 mb-2">Role (Kids)</label>
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
            <label className="block text-sm font-bold text-gray-700 mb-2">Age Group</label>
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
