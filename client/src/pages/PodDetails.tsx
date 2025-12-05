import { useRoute, useLocation } from "wouter";
import { ChevronLeft, Settings, Send, Image as ImageIcon, Smile, MapPin } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ExperienceCard } from "@/components/shared/ExperienceCard";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatExperience } from "@/lib/types";

export default function PodDetails() {
  const [match, params] = useRoute("/pod/:id");
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"chat" | "experiences" | "trips">("chat");
  const [messageInput, setMessageInput] = useState("");
  const queryClient = useQueryClient();

  const { data: podDetails } = useQuery({
    queryKey: ["podDetails", params?.id],
    queryFn: () => params?.id ? api.pods.getDetails(parseInt(params.id)) : null,
    enabled: !!match && !!params?.id,
  });

  const pod = podDetails?.pod;
  const members = podDetails?.members || [];

  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ["messages", params?.id],
    queryFn: () => params?.id ? api.pods.getMessages(parseInt(params.id)) : [],
    enabled: !!match && !!params?.id,
    refetchInterval: 3000,
  });

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: api.users.getMe,
  });

  const { data: experiences = [] } = useQuery({
    queryKey: ["experiences"],
    queryFn: api.experiences.getAll,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!params?.id || !messageInput.trim()) return;
      return api.pods.sendMessage(parseInt(params.id), messageInput);
    },
    onSuccess: () => {
      setMessageInput("");
      refetchMessages();
    },
  });

  const formattedExperiences = experiences.map(exp => 
    formatExperience(exp, "Family", "https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=400")
  );

  if (!match || !pod) return null;

  return (
    <div className="flex h-screen flex-col bg-background pb-20">
      {/* Header */}
      <div className="border-b border-gray-100 bg-white px-6 pt-14 pb-4 shadow-sm z-10">
        <div className="mb-4 flex items-center justify-between">
          <button 
            onClick={() => setLocation("/pods")} 
            className="rounded-full bg-gray-100 p-2 active:scale-90"
            data-testid="button-back"
          >
            <ChevronLeft className="h-6 w-6 text-gray-700" />
          </button>
          <button className="rounded-full bg-gray-100 p-2 active:scale-90" data-testid="button-settings">
            <Settings className="h-6 w-6 text-gray-700" />
          </button>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex -space-x-4">
            {members.slice(0, 3).map((member) => (
              <img 
                key={member.id} 
                src={member.avatar || 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=400'} 
                alt={member.name || 'Family'}
                className="h-12 w-12 rounded-full border-2 border-white ring-1 ring-gray-100 object-cover" 
              />
            ))}
            {members.length > 3 && (
              <div className="h-12 w-12 rounded-full border-2 border-white ring-1 ring-gray-100 bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                +{members.length - 3}
              </div>
            )}
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold text-gray-900" data-testid="text-pod-name">{pod.name}</h1>
            <p className="text-xs font-medium text-gray-500">{members.length} {members.length === 1 ? 'family' : 'families'}</p>
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
              data-testid={`button-tab-${t}`}
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
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                  <p className="text-sm">No messages yet. Say hi!</p>
                </div>
              ) : messages.map((msg) => {
                const isMe = msg.userId === currentUser?.id;
                return (
                  <div key={msg.id} className={cn("flex gap-3", isMe && "flex-row-reverse")}>
                    {!isMe ? (
                      <img 
                        src={msg.user.avatar || 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=400'} 
                        className="h-8 w-8 rounded-full object-cover" 
                        alt={msg.user.name || 'Family'} 
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">You</div>
                    )}
                    <div className={cn(
                      "rounded-2xl p-3 shadow-sm max-w-[70%]",
                      isMe ? "rounded-tr-none bg-primary" : "rounded-tl-none bg-white"
                    )}>
                      <p className={cn("text-sm", isMe ? "text-white" : "text-gray-800")}>{msg.content}</p>
                      <span className={cn("mt-1 block text-[10px]", isMe ? "text-primary-foreground/70" : "text-gray-400")}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 bg-white p-4 pb-8">
               <div className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2">
                 <button className="text-gray-400 hover:text-primary" data-testid="button-image"><ImageIcon className="h-5 w-5" /></button>
                 <input 
                    type="text" 
                    placeholder="Message..." 
                    className="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-gray-400"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessageMutation.mutate()}
                    data-testid="input-message"
                 />
                 <button className="text-gray-400 hover:text-primary"><Smile className="h-5 w-5" /></button>
                 <button 
                   className="rounded-full bg-primary p-2 text-white shadow-sm active:scale-90 transition-transform disabled:opacity-50"
                   onClick={() => sendMessageMutation.mutate()}
                   disabled={sendMessageMutation.isPending || !messageInput.trim()}
                   data-testid="button-send"
                 >
                   <Send className="h-4 w-4" />
                 </button>
               </div>
            </div>
          </div>
        )}

        {activeTab === "experiences" && (
          <div className="p-6 space-y-4">
            <p className="text-sm font-medium text-gray-500 mb-4">Experiences recommended by this pod</p>
            {formattedExperiences.map((exp) => (
              <ExperienceCard key={exp.id} experience={exp} />
            ))}
          </div>
        )}
        
        {activeTab === "trips" && (
           <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <MapPin className="h-12 w-12 mb-2 opacity-20" />
              <p className="text-sm">No trips planned yet.</p>
              <button className="mt-4 text-primary font-bold text-sm" data-testid="button-plan-trip">Plan a Trip</button>
           </div>
        )}
      </div>
    </div>
  );
}
