import { ExperienceCard } from "@/components/shared/ExperienceCard";
import { PodCard } from "@/components/shared/PodCard";
import { Settings, MapPin } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatExperience } from "@/lib/types";

export default function Profile() {
  const [activeTab, setActiveTab] = useState<"experiences" | "saved" | "pods">("experiences");

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: api.users.getMe,
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

  const formattedUserExperiences = userExperiences.map(exp => 
    formatExperience(exp, currentUser?.name, currentUser?.avatar)
  );

  const formattedSavedExperiences = savedExperiences.map(exp => 
    formatExperience(exp, "Family", "https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=400")
  );

  return (
    <div className="min-h-screen bg-background pt-14 pb-32 px-6">
      <div className="mb-6 flex justify-end">
        <Settings className="h-6 w-6 text-gray-400" data-testid="button-settings" />
      </div>

      {/* Profile Header */}
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
