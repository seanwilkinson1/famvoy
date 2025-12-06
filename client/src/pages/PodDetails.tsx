import { useRoute, useLocation } from "wouter";
import { ChevronLeft, Settings, Send, Image as ImageIcon, Smile, MapPin, X, Share2, Camera, Plus, Trash2 } from "lucide-react";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { ExperienceCard } from "@/components/shared/ExperienceCard";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatExperience } from "@/lib/types";
import type { Experience } from "@shared/schema";
import { toast } from "sonner";

export default function PodDetails() {
  const [match, params] = useRoute("/pod/:id");
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"chat" | "experiences" | "trips">("chat");
  const [messageInput, setMessageInput] = useState("");
  const [showExperiencePicker, setShowExperiencePicker] = useState(false);
  const [showAddExperienceModal, setShowAddExperienceModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const podId = params?.id ? parseInt(params.id) : 0;

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

  const { data: allExperiences = [] } = useQuery({
    queryKey: ["experiences"],
    queryFn: api.experiences.getAll,
  });

  const { data: podExperiences = [] } = useQuery({
    queryKey: ["podExperiences", podId],
    queryFn: () => api.pods.getExperiences(podId),
    enabled: podId > 0,
  });

  const addExperienceMutation = useMutation({
    mutationFn: (experienceId: number) => api.pods.addExperience(podId, experienceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["podExperiences", podId] });
      setShowAddExperienceModal(false);
      toast.success("Experience added to pod!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const removeExperienceMutation = useMutation({
    mutationFn: (experienceId: number) => api.pods.removeExperience(podId, experienceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["podExperiences", podId] });
      toast.success("Experience removed from pod");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data?: { messageType?: string; imageUrl?: string; sharedExperienceId?: number }) => {
      if (!params?.id) return;
      const content = data?.messageType === 'image' ? '' : (data?.messageType === 'experience' ? '' : messageInput.trim());
      if (!content && !data?.imageUrl && !data?.sharedExperienceId) return;
      return api.pods.sendMessage(parseInt(params.id), {
        content,
        messageType: data?.messageType || 'text',
        imageUrl: data?.imageUrl,
        sharedExperienceId: data?.sharedExperienceId,
      });
    },
    onSuccess: () => {
      setMessageInput("");
      refetchMessages();
    },
  });

  const formattedPodExperiences = podExperiences.map(exp => formatExperience(exp as any));
  
  const podExperienceIds = new Set(podExperiences.map(e => e.id));
  const availableExperiences = allExperiences.filter(e => !podExperienceIds.has(e.id));

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const url = await api.upload.image(file);
      await sendMessageMutation.mutateAsync({ messageType: 'image', imageUrl: url });
    } catch (err) {
      console.error('Failed to upload image:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleShareExperience = async (experience: Experience) => {
    await sendMessageMutation.mutateAsync({ 
      messageType: 'experience', 
      sharedExperienceId: experience.id 
    });
    setShowExperiencePicker(false);
  };

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
                const sharedExp = msg.sharedExperienceId ? allExperiences.find(e => e.id === msg.sharedExperienceId) : null;
                
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
                      "rounded-2xl shadow-sm max-w-[75%] overflow-hidden",
                      msg.messageType === 'image' || msg.messageType === 'experience' ? "p-0" : "p-3",
                      isMe ? "rounded-tr-none bg-primary" : "rounded-tl-none bg-white"
                    )}>
                      {msg.messageType === 'image' && msg.imageUrl ? (
                        <div>
                          <img 
                            src={msg.imageUrl} 
                            alt="Shared image" 
                            className="w-full max-h-64 object-cover cursor-pointer"
                            onClick={() => window.open(msg.imageUrl!, '_blank')}
                          />
                          <span className={cn("block text-[10px] p-2", isMe ? "text-primary-foreground/70" : "text-gray-400")}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ) : msg.messageType === 'experience' && sharedExp ? (
                        <div 
                          className="cursor-pointer"
                          onClick={() => setLocation(`/experience/${sharedExp.id}`)}
                        >
                          <div className="relative h-32 w-full">
                            <img 
                              src={sharedExp.image || 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400'} 
                              alt={sharedExp.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <div className="absolute bottom-2 left-2 right-2">
                              <span className="inline-block rounded bg-primary/90 px-1.5 py-0.5 text-[10px] font-bold text-white mb-1">
                                {sharedExp.category}
                              </span>
                              <p className="text-xs font-bold text-white line-clamp-1">{sharedExp.title}</p>
                            </div>
                          </div>
                          <div className="p-2">
                            <p className={cn("text-xs", isMe ? "text-primary-foreground/80" : "text-gray-500")}>
                              Shared an experience
                            </p>
                            <span className={cn("block text-[10px]", isMe ? "text-primary-foreground/70" : "text-gray-400")}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className={cn("text-sm", isMe ? "text-white" : "text-gray-800")}>{msg.content}</p>
                          <span className={cn("mt-1 block text-[10px]", isMe ? "text-primary-foreground/70" : "text-gray-400")}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Experience Picker Modal */}
            {showExperiencePicker && (
              <div className="absolute inset-0 bg-black/50 z-50 flex items-end">
                <div className="bg-white rounded-t-3xl w-full max-h-[70vh] overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3 className="font-heading text-lg font-bold">Share an Experience</h3>
                    <button 
                      onClick={() => setShowExperiencePicker(false)}
                      className="rounded-full bg-gray-100 p-2"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="overflow-y-auto p-4 space-y-3 max-h-[55vh]">
                    {allExperiences.length === 0 ? (
                      <p className="text-center text-gray-400 py-8">No experiences to share</p>
                    ) : allExperiences.map((exp) => (
                      <div 
                        key={exp.id}
                        onClick={() => handleShareExperience(exp)}
                        className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <img 
                          src={exp.image || 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400'} 
                          alt={exp.title}
                          className="h-16 w-16 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="inline-block rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary mb-1">
                            {exp.category}
                          </span>
                          <p className="font-bold text-sm text-gray-900 line-clamp-1">{exp.title}</p>
                          <p className="text-xs text-gray-500 line-clamp-1">{exp.locationName}</p>
                        </div>
                        <Share2 className="h-5 w-5 text-gray-400" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="border-t border-gray-200 bg-white p-4 pb-8">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <div className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2">
                <button 
                  className="text-gray-400 hover:text-primary disabled:opacity-50" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  data-testid="button-image"
                >
                  {isUploading ? (
                    <div className="h-5 w-5 rounded-full border-2 border-gray-300 border-t-primary animate-spin" />
                  ) : (
                    <Camera className="h-5 w-5" />
                  )}
                </button>
                <button 
                  className="text-gray-400 hover:text-primary"
                  onClick={() => setShowExperiencePicker(true)}
                  data-testid="button-share-experience"
                >
                  <Share2 className="h-5 w-5" />
                </button>
                <input 
                  type="text" 
                  placeholder="Message..." 
                  className="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-gray-400"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && messageInput.trim() && sendMessageMutation.mutate({})}
                  data-testid="input-message"
                />
                <button 
                  className="rounded-full bg-primary p-2 text-white shadow-sm active:scale-90 transition-transform disabled:opacity-50"
                  onClick={() => sendMessageMutation.mutate({})}
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
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-500">Pod's curated experiences</p>
              <button
                onClick={() => setShowAddExperienceModal(true)}
                className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-sm active:scale-95 transition-transform"
                data-testid="button-add-experience"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
            
            {formattedPodExperiences.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <MapPin className="h-12 w-12 mb-2 opacity-20" />
                <p className="text-sm">No experiences added yet</p>
                <button 
                  onClick={() => setShowAddExperienceModal(true)}
                  className="mt-4 text-primary font-bold text-sm"
                  data-testid="button-add-first-experience"
                >
                  Add your first experience
                </button>
              </div>
            ) : (
              formattedPodExperiences.map((exp) => (
                <div key={exp.id} className="relative">
                  <ExperienceCard experience={exp} />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeExperienceMutation.mutate(exp.id);
                    }}
                    className="absolute top-2 right-2 rounded-full bg-red-500 p-1.5 text-white shadow-md hover:bg-red-600 transition-colors z-10"
                    data-testid={`button-remove-experience-${exp.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
        
        {/* Add Experience Modal */}
        {showAddExperienceModal && (
          <div className="absolute inset-0 bg-black/50 z-50 flex items-end">
            <div className="bg-white rounded-t-3xl w-full max-h-[70vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h3 className="font-heading text-lg font-bold">Add Experience to Pod</h3>
                <button 
                  onClick={() => setShowAddExperienceModal(false)}
                  className="rounded-full bg-gray-100 p-2"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="overflow-y-auto p-4 space-y-3 max-h-[55vh]">
                {availableExperiences.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">All experiences already added to this pod</p>
                ) : availableExperiences.map((exp) => (
                  <div 
                    key={exp.id}
                    onClick={() => addExperienceMutation.mutate(exp.id)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <img 
                      src={exp.image || 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400'} 
                      alt={exp.title}
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="inline-block rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary mb-1">
                        {exp.category}
                      </span>
                      <p className="font-bold text-sm text-gray-900 line-clamp-1">{exp.title}</p>
                      <p className="text-xs text-gray-500 line-clamp-1">{exp.locationName}</p>
                    </div>
                    <Plus className="h-5 w-5 text-primary" />
                  </div>
                ))}
              </div>
            </div>
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
