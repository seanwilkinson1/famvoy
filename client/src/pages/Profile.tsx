import { currentUser, experiences, pods } from "@/lib/data";
import { ExperienceCard } from "@/components/shared/ExperienceCard";
import { PodCard } from "@/components/shared/PodCard";
import { Settings, MapPin } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function Profile() {
  const [activeTab, setActiveTab] = useState<"experiences" | "saved" | "pods">("experiences");

  return (
    <div className="min-h-screen bg-background pt-14 pb-32 px-6">
      <div className="mb-6 flex justify-end">
        <Settings className="h-6 w-6 text-gray-400" />
      </div>

      {/* Profile Header */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="relative mb-4">
          <img
            src={currentUser.avatar}
            alt="Profile"
            className="h-24 w-24 rounded-full object-cover ring-4 ring-white shadow-lg"
          />
          <div className="absolute bottom-0 right-0 rounded-full bg-primary p-1.5 ring-4 ring-white">
            <div className="h-3 w-3 rounded-full bg-white" />
          </div>
        </div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">{currentUser.name}</h1>
        <div className="mt-2 flex items-center gap-1 text-sm text-gray-500">
          <MapPin className="h-3.5 w-3.5" />
          {currentUser.location}
        </div>
        <p className="mt-1 text-sm font-medium text-gray-500">{currentUser.kids}</p>

        {/* Interest Tags */}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {currentUser.interests.map((tag) => (
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
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Grid */}
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === "experiences" && (
          <>
            {experiences.slice(0, 2).map((exp) => (
              <ExperienceCard key={exp.id} experience={exp} />
            ))}
            <div className="py-8 text-center text-sm text-gray-400">
              That's all {currentUser.name} has shared yet.
            </div>
          </>
        )}

        {activeTab === "saved" && (
           <>
            {experiences.slice(1, 3).map((exp) => (
              <ExperienceCard key={exp.id} experience={exp} />
            ))}
          </>
        )}

        {activeTab === "pods" && (
           <>
            {pods.map((pod) => (
              <PodCard key={pod.id} pod={pod} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
