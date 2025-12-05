import { ExperienceCard } from "@/components/shared/ExperienceCard";
import { PodCard } from "@/components/shared/PodCard";
import { Settings, MapPin, Edit2, X, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatExperience } from "@/lib/types";
import { useClerk } from "@clerk/clerk-react";

const INTEREST_OPTIONS = [
  "Hiking", "Beach", "Parks", "Museums", "Playgrounds", "Sports", 
  "Art", "Music", "Cooking", "Reading", "Travel", "Camping", 
  "Biking", "Swimming", "Dance", "Food", "Nature", "Science"
];

export default function Profile() {
  const [activeTab, setActiveTab] = useState<"experiences" | "saved" | "pods">("experiences");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    location: "",
    kids: "",
    bio: "",
    interests: [] as string[],
  });

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

  const formattedUserExperiences = userExperiences.map(exp => 
    formatExperience(exp, currentUser?.name || undefined, currentUser?.avatar || undefined)
  );

  const formattedSavedExperiences = savedExperiences.map(exp => 
    formatExperience(exp, "Family", "https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=400")
  );

  return (
    <div className="min-h-screen bg-background pt-14 pb-32 px-6">
      <div className="mb-6 flex justify-between">
        <button
          onClick={() => signOut()}
          className="text-sm text-gray-400 hover:text-gray-600"
          data-testid="button-logout"
        >
          Sign Out
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
            <img
              src={currentUser?.avatar || "https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=400"}
              alt="Profile"
              className="h-24 w-24 rounded-full object-cover ring-4 ring-white shadow-lg mb-4"
            />
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
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex rounded-xl bg-gray-100 p-1">
        {[
          { id: "experiences", label: "Experiences" },
          { id: "saved", label: "Saved" },
          { id: "pods", label: "Pods" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-bold transition-all",
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
              formattedUserExperiences.map((exp) => (
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
              formattedSavedExperiences.map((exp) => (
                <ExperienceCard key={exp.id} experience={exp} />
              ))
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
      </div>
    </div>
  );
}
