import { ExperienceCard } from "@/components/shared/ExperienceCard";
import { PodCard } from "@/components/shared/PodCard";
import { ImageUpload } from "@/components/shared/ImageUpload";
import { Settings as SettingsIcon, MapPin, Edit2, X, Check, Award, Trophy, CheckCircle, Star, Heart, Globe, Quote, Plane, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatExperience } from "@/lib/types";
import { useClerk } from "@clerk/clerk-react";
import { useLocation } from "wouter";
import type { FamilyMember } from "@shared/schema";
import { FAMILY_VALUES, LANGUAGES, FAMILY_ROLES, AGE_GROUPS } from "@/lib/constants";
import { Plus, Trash2, UserPlus } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<"experiences" | "saved" | "completed" | "pods" | "trips">("experiences");
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
  });

  const { data: savedExperiences = [] } = useQuery({
    queryKey: ["savedExperiences", currentUser?.id],
    queryFn: () => currentUser ? api.users.getSavedExperiences(currentUser.id) : [],
    enabled: !!currentUser,
  });

  const { data: pods = [] } = useQuery({
    queryKey: ["userPods", currentUser?.id],
    queryFn: () => currentUser ? api.users.getPods(currentUser.id) : [],
    enabled: !!currentUser,
  });

  const { data: userBadges = [] } = useQuery({
    queryKey: ["userBadges", currentUser?.id],
    queryFn: () => currentUser ? api.badges.getByUser(currentUser.id) : [],
    enabled: !!currentUser,
  });

  const { data: userTrips = [] } = useQuery({
    queryKey: ["userTrips", currentUser?.id],
    queryFn: api.users.getMyTrips,
    enabled: !!currentUser,
  });

  const { data: userCheckins = [] } = useQuery({
    queryKey: ["userCheckins", currentUser?.id],
    queryFn: () => currentUser ? api.checkins.getByUser(currentUser.id) : [],
    enabled: !!currentUser,
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

  return (
    <div className="min-h-screen bg-background pt-14 pb-32 px-6">
      <div className="mb-6 flex justify-between">
        <button
          onClick={() => setLocation("/settings")}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          data-testid="button-settings"
        >
          <SettingsIcon className="h-4 w-4" />
          Settings
        </button>
        {isEditing ? (
          <div className="flex gap-2">
            <button 
              onClick={() => setIsEditing(false)}
              className="rounded-full bg-gray-100 p-2"
              data-testid="button-cancel-edit"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
            <button 
              onClick={() => updateProfileMutation.mutate()}
              disabled={updateProfileMutation.isPending}
              className="rounded-full bg-primary p-2"
              data-testid="button-save-profile"
            >
              <Check className="h-5 w-5 text-white" />
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setIsEditing(true)}
            className="rounded-full bg-gray-100 p-2"
            data-testid="button-edit-profile"
          >
            <Edit2 className="h-5 w-5 text-gray-500" />
          </button>
        )}
      </div>

      {/* Profile Header */}
      {isEditing ? (
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
            <input
              type="text"
              value={editForm.location}
              onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-white p-4 text-base font-medium focus:border-primary focus:outline-none"
              placeholder="City, State"
              data-testid="input-edit-location"
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
      ) : (
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative mb-4">
            <img
              src={currentUser?.avatar || "https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=400"}
              alt="Profile"
              className="h-24 w-24 rounded-full object-cover ring-4 ring-white shadow-lg"
              data-testid="img-avatar"
            />
            <div className="absolute bottom-0 right-0 rounded-full bg-primary p-1.5 ring-4 ring-white">
              <div className="h-3 w-3 rounded-full bg-white" />
            </div>
          </div>
          <h1 className="font-heading text-2xl font-bold text-gray-900" data-testid="text-username">{currentUser?.name || "Loading..."}</h1>
          <div className="mt-2 flex items-center gap-1 text-sm text-gray-500">
            <MapPin className="h-3.5 w-3.5" />
            {currentUser?.location || "Loading..."}
          </div>
          <p className="mt-1 text-sm font-medium text-gray-500">{currentUser?.kids || ""}</p>
          {currentUser?.bio && (
            <p className="mt-2 text-sm text-gray-600 max-w-xs">{currentUser.bio}</p>
          )}

          {/* Interest Tags */}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {currentUser?.interests?.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-secondary/50 px-3 py-1 text-xs font-bold text-secondary-foreground"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Family Members Grid - Team Style */}
          {familyMembers.length > 0 && (
            <div className="mt-8 w-full max-w-md">
              <h3 className="font-heading text-lg font-bold text-gray-900 text-center mb-4">
                <Users className="inline-block h-5 w-5 mr-2 text-primary" />
                Meet Our Family
              </h3>
              
              {adultMembers.length > 0 && (
                <div className="mb-6">
                  <span className="inline-block px-3 py-1 text-xs font-bold bg-primary/10 text-primary rounded-full mb-3">
                    Adults
                  </span>
                  <div className="flex flex-wrap justify-center gap-4">
                    {adultMembers.map((member) => (
                      <div key={member.id} className="flex flex-col items-center" data-testid={`family-member-${member.id}`}>
                        <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-gray-200 bg-gray-100">
                          {member.photo ? (
                            <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl bg-gradient-to-br from-primary/20 to-primary/40">
                              {member.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <p className="mt-2 text-sm font-bold text-gray-900">{member.name}</p>
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
                  <div className="flex flex-wrap justify-center gap-4">
                    {kidMembers.map((member) => (
                      <div key={member.id} className="flex flex-col items-center" data-testid={`family-member-${member.id}`}>
                        <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-gray-200 bg-gray-100">
                          {member.photo ? (
                            <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl bg-gradient-to-br from-secondary/20 to-secondary/40">
                              {member.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <p className="mt-2 text-sm font-bold text-gray-900">{member.name}</p>
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

          {/* Enhanced Profile Info */}
          <div className="mt-8 w-full max-w-md space-y-4">
            {currentUser?.familyValues && currentUser.familyValues.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="h-4 w-4 text-rose-500" />
                  <h4 className="font-bold text-sm text-gray-900">Family Values</h4>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {currentUser.familyValues.map((value) => (
                    <span key={value} className="px-2.5 py-1 bg-rose-50 text-rose-700 text-xs rounded-full font-medium">
                      {value}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {currentUser?.languages && currentUser.languages.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-4 w-4 text-blue-500" />
                  <h4 className="font-bold text-sm text-gray-900">Languages</h4>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {currentUser.languages.map((lang) => (
                    <span key={lang} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(currentUser?.familyMotto || currentUser?.favoriteTraditions || currentUser?.dreamVacation || currentUser?.pets) && (
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
                {currentUser?.familyMotto && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Quote className="h-4 w-4 text-purple-500" />
                      <h4 className="font-bold text-sm text-gray-900">Our Motto</h4>
                    </div>
                    <p className="text-sm text-gray-600 italic">"{currentUser.familyMotto}"</p>
                  </div>
                )}
                
                {currentUser?.favoriteTraditions && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Star className="h-4 w-4 text-amber-500" />
                      <h4 className="font-bold text-sm text-gray-900">Favorite Traditions</h4>
                    </div>
                    <p className="text-sm text-gray-600">{currentUser.favoriteTraditions}</p>
                  </div>
                )}
                
                {currentUser?.dreamVacation && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Plane className="h-4 w-4 text-teal-500" />
                      <h4 className="font-bold text-sm text-gray-900">Dream Vacation</h4>
                    </div>
                    <p className="text-sm text-gray-600">{currentUser.dreamVacation}</p>
                  </div>
                )}
                
                {currentUser?.pets && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">🐾</span>
                      <h4 className="font-bold text-sm text-gray-900">Pets</h4>
                    </div>
                    <p className="text-sm text-gray-600">{currentUser.pets}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex rounded-xl bg-gray-100 p-1">
        {[
          { id: "experiences", label: "Posts" },
          { id: "saved", label: "Saved" },
          { id: "completed", label: "Done" },
          { id: "pods", label: "Pods" },
          { id: "trips", label: "Trips" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex-1 rounded-lg py-2 text-xs font-bold transition-all",
              activeTab === tab.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
            data-testid={`button-tab-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Grid */}
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === "experiences" && (
          <>
            {formattedUserExperiences.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">
                No experiences shared yet.
              </div>
            ) : (
              [...formattedUserExperiences].reverse().map((exp) => (
                <ExperienceCard key={exp.id} experience={exp} />
              ))
            )}
          </>
        )}

        {activeTab === "saved" && (
           <>
            {formattedSavedExperiences.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">
                No saved experiences yet.
              </div>
            ) : (
              [...formattedSavedExperiences].reverse().map((exp) => (
                <ExperienceCard key={exp.id} experience={exp} />
              ))
            )}
          </>
        )}

        {activeTab === "completed" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-bold text-gray-900">{userCheckins.length} Completed</span>
              </div>
            </div>
            {userCheckins.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-400">No experiences completed yet</p>
                <p className="text-xs text-gray-400 mt-1">Try an experience and tap "I Did This!"</p>
              </div>
            ) : (
              <div className="space-y-4">
                {[...userCheckins].reverse().map((checkin: any) => (
                  <div 
                    key={checkin.id}
                    className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100 cursor-pointer"
                    onClick={() => setLocation(`/experience/${checkin.experienceId}`)}
                    data-testid={`checkin-card-${checkin.id}`}
                  >
                    <div className="flex gap-4">
                      {checkin.photoUrl && (
                        <img
                          src={checkin.photoUrl}
                          alt="Check-in"
                          className="h-20 w-20 rounded-xl object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 line-clamp-1">
                          {checkin.experience?.title || 'Experience'}
                        </p>
                        {checkin.rating && (
                          <div className="flex items-center gap-0.5 mt-1">
                            {[...Array(checkin.rating)].map((_, i) => (
                              <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                        )}
                        {checkin.review && (
                          <p className="text-sm text-gray-600 line-clamp-2 mt-1">{checkin.review}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          Completed {new Date(checkin.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "pods" && (
           <>
            {pods.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">
                No pods joined yet.
              </div>
            ) : (
              pods.map((pod) => (
                <PodCard key={pod.id} pod={pod} />
              ))
            )}
          </>
        )}

        {activeTab === "trips" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Plane className="h-5 w-5 text-primary" />
                <span className="font-bold text-gray-900">{userTrips.length} Trips</span>
              </div>
            </div>
            {userTrips.length === 0 ? (
              <div className="py-8 text-center">
                <Plane className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-400">No trips planned yet</p>
                <p className="text-xs text-gray-400 mt-1">Join a pod and start planning your first trip!</p>
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
          </>
        )}
      </div>

      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto animate-slide-up mb-20 sm:mb-0 mx-4">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h2 className="font-heading text-xl font-bold">Add Family Member</h2>
              <button
                onClick={() => {
                  setShowAddMemberModal(false);
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
      )}
    </div>
  );
}
