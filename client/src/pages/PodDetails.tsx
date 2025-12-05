import { useRoute, useLocation } from "wouter";
import { pods, experiences } from "@/lib/data";
import { ChevronLeft, Settings, Send, Image as ImageIcon, Smile, MapPin } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ExperienceCard } from "@/components/shared/ExperienceCard";

export default function PodDetails() {
  const [match, params] = useRoute("/pod/:id");
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"chat" | "experiences" | "trips">("chat");

  if (!match) return null;

  const pod = pods.find((p) => p.id === params.id) || pods[0];

  return (
    <div className="flex h-screen flex-col bg-background pb-20">
      {/* Header */}
      <div className="border-b border-gray-100 bg-white px-6 pt-14 pb-4 shadow-sm z-10">
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => setLocation("/pods")} className="rounded-full bg-gray-100 p-2 active:scale-90">
            <ChevronLeft className="h-6 w-6 text-gray-700" />
          </button>
          <button className="rounded-full bg-gray-100 p-2 active:scale-90">
            <Settings className="h-6 w-6 text-gray-700" />
          </button>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex -space-x-4">
            {pod.members.map((m, i) => (
              <img key={i} src={m} className="h-12 w-12 rounded-full border-2 border-white ring-1 ring-gray-100" />
            ))}
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold text-gray-900">{pod.name}</h1>
            <p className="text-xs font-medium text-gray-500">{pod.members.length} families</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex rounded-xl bg-gray-100 p-1">
          {["chat", "experiences", "trips"].map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t as any)}
              className={cn(
                "flex-1 rounded-lg py-2 text-sm font-bold capitalize transition-all",
                activeTab === t ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50/50">
        {activeTab === "chat" && (
          <div className="flex h-full flex-col">
            <div className="flex-1 space-y-4 p-4">
              {/* Mock Messages */}
              <div className="flex gap-3">
                <img src={pod.members[0]} className="h-8 w-8 rounded-full" />
                <div className="rounded-2xl rounded-tl-none bg-white p-3 shadow-sm">
                  <p className="text-sm text-gray-800">Has anyone been to the new science center yet?</p>
                  <span className="mt-1 block text-[10px] text-gray-400">10:23 AM</span>
                </div>
              </div>
              
              <div className="flex gap-3 flex-row-reverse">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">You</div>
                <div className="rounded-2xl rounded-tr-none bg-primary p-3 shadow-sm">
                  <p className="text-sm text-white">Yes! We went last weekend. It's amazing for the older kids.</p>
                  <span className="mt-1 block text-[10px] text-primary-foreground/70">10:25 AM</span>
                </div>
              </div>

              <div className="flex gap-3">
                <img src={pod.members[1]} className="h-8 w-8 rounded-full" />
                <div className="rounded-2xl rounded-tl-none bg-white p-3 shadow-sm">
                  <p className="text-sm text-gray-800">We should plan a group trip there next month!</p>
                  <span className="mt-1 block text-[10px] text-gray-400">10:40 AM</span>
                </div>
              </div>
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 bg-white p-4 pb-8">
               <div className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2">
                 <button className="text-gray-400 hover:text-primary"><ImageIcon className="h-5 w-5" /></button>
                 <input 
                    type="text" 
                    placeholder="Message..." 
                    className="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-gray-400"
                 />
                 <button className="text-gray-400 hover:text-primary"><Smile className="h-5 w-5" /></button>
                 <button className="rounded-full bg-primary p-2 text-white shadow-sm active:scale-90 transition-transform">
                   <Send className="h-4 w-4" />
                 </button>
               </div>
            </div>
          </div>
        )}

        {activeTab === "experiences" && (
          <div className="p-6 space-y-4">
            <p className="text-sm font-medium text-gray-500 mb-4">Experiences recommended by this pod</p>
            {experiences.map((exp) => (
              <ExperienceCard key={exp.id} experience={exp} />
            ))}
          </div>
        )}
        
        {activeTab === "trips" && (
           <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <MapPin className="h-12 w-12 mb-2 opacity-20" />
              <p className="text-sm">No trips planned yet.</p>
              <button className="mt-4 text-primary font-bold text-sm">Plan a Trip</button>
           </div>
        )}
      </div>
    </div>
  );
}
