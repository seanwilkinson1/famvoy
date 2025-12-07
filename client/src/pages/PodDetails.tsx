import { useRoute, useLocation } from "wouter";
import { ChevronLeft, Settings, Send, Image as ImageIcon, Smile, MapPin, X, Share2, Camera, Plus, Trash2, FolderPlus, Images, Loader2, Plane, Calendar, Sparkles } from "lucide-react";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { ExperienceCard } from "@/components/shared/ExperienceCard";
import { PodSettingsModal } from "@/components/shared/PodSettingsModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatExperience } from "@/lib/types";
import type { Experience } from "@shared/schema";
import { toast } from "sonner";
import { format } from "date-fns";

export default function PodDetails() {
  const [match, params] = useRoute("/pod/:id");
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"chat" | "experiences" | "albums" | "trips">("chat");
  const [messageInput, setMessageInput] = useState("");
  const [showExperiencePicker, setShowExperiencePicker] = useState(false);
  const [showAddExperienceModal, setShowAddExperienceModal] = useState(false);
  const [showCreateAlbumModal, setShowCreateAlbumModal] = useState(false);
  const [showCreateTripModal, setShowCreateTripModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<any | null>(null);
  const [albumName, setAlbumName] = useState("");
  const [albumDescription, setAlbumDescription] = useState("");
  const [tripName, setTripName] = useState("");
  const [tripDestination, setTripDestination] = useState("");
  const [tripStartDate, setTripStartDate] = useState("");
  const [tripEndDate, setTripEndDate] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingAlbumPhoto, setIsUploadingAlbumPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const albumPhotoInputRef = useRef<HTMLInputElement>(null);
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

  const { data: podAlbums = [] } = useQuery({
    queryKey: ["podAlbums", podId],
    queryFn: () => api.albums.getByPod(podId),
    enabled: podId > 0,
  });

  const { data: albumPhotos = [] } = useQuery({
    queryKey: ["albumPhotos", selectedAlbum?.id],
    queryFn: () => selectedAlbum ? api.albums.getPhotos(selectedAlbum.id) : [],
    enabled: !!selectedAlbum,
  });

  const { data: podTrips = [] } = useQuery({
    queryKey: ["podTrips", podId],
    queryFn: () => api.trips.getByPod(podId),
    enabled: podId > 0,
  });

  const createTripMutation = useMutation({
    mutationFn: () => api.trips.create(podId, {
      name: tripName,
      destination: tripDestination,
      startDate: tripStartDate,
      endDate: tripEndDate,
    }),
    onSuccess: (trip) => {
      queryClient.invalidateQueries({ queryKey: ["podTrips", podId] });
      setShowCreateTripModal(false);
      setTripName("");
      setTripDestination("");
      setTripStartDate("");
      setTripEndDate("");
      toast.success("Trip created!");
      setLocation(`/trip/${trip.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const createAlbumMutation = useMutation({
    mutationFn: () => api.albums.create(podId, { name: albumName, description: albumDescription || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["podAlbums", podId] });
      setShowCreateAlbumModal(false);
      setAlbumName("");
      setAlbumDescription("");
      toast.success("Album created!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteAlbumMutation = useMutation({
    mutationFn: (albumId: number) => api.albums.delete(albumId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["podAlbums", podId] });
      setSelectedAlbum(null);
      toast.success("Album deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const addPhotoMutation = useMutation({
    mutationFn: (data: { photoUrl: string; caption?: string }) => 
      api.albums.addPhoto(selectedAlbum.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["albumPhotos", selectedAlbum?.id] });
      queryClient.invalidateQueries({ queryKey: ["podAlbums", podId] });
      toast.success("Photo added!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: (photoId: number) => api.albums.deletePhoto(photoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["albumPhotos", selectedAlbum?.id] });
      queryClient.invalidateQueries({ queryKey: ["podAlbums", podId] });
      toast.success("Photo deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
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

  const handleAlbumPhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedAlbum) return;

    setIsUploadingAlbumPhoto(true);
    try {
      const url = await api.upload.image(file);
      await addPhotoMutation.mutateAsync({ photoUrl: url });
    } catch (err) {
      console.error('Failed to upload album photo:', err);
      toast.error('Failed to upload photo');
    } finally {
      setIsUploadingAlbumPhoto(false);
      if (albumPhotoInputRef.current) albumPhotoInputRef.current.value = '';
    }
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
          <button 
            onClick={() => setShowSettingsModal(true)}
            className="rounded-full bg-gray-100 p-2 active:scale-90" 
            data-testid="button-settings"
          >
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
          {["chat", "experiences", "albums", "trips"].map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t as any)}
              className={cn(
                "flex-1 rounded-lg py-2 text-xs font-bold capitalize transition-all",
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
        
        {activeTab === "albums" && !selectedAlbum && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-500">Pod photo albums</p>
              <button
                onClick={() => setShowCreateAlbumModal(true)}
                className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-sm active:scale-95 transition-transform"
                data-testid="button-create-album"
              >
                <FolderPlus className="h-4 w-4" />
                New Album
              </button>
            </div>
            
            {podAlbums.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Images className="h-12 w-12 mb-2 opacity-20" />
                <p className="text-sm">No albums yet</p>
                <button 
                  onClick={() => setShowCreateAlbumModal(true)}
                  className="mt-4 text-primary font-bold text-sm"
                  data-testid="button-create-first-album"
                >
                  Create your first album
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {podAlbums.map((album: any) => (
                  <div 
                    key={album.id}
                    onClick={() => setSelectedAlbum(album)}
                    className="relative rounded-xl overflow-hidden bg-white shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                    data-testid={`album-card-${album.id}`}
                  >
                    <div className="aspect-square bg-gray-100">
                      {album.coverPhotoUrl ? (
                        <img 
                          src={album.coverPhotoUrl} 
                          alt={album.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Images className="h-12 w-12 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-bold text-sm text-gray-900 line-clamp-1">{album.name}</p>
                      <p className="text-xs text-gray-500">{album.photoCount} photos</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "albums" && selectedAlbum && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <button 
                onClick={() => setSelectedAlbum(null)}
                className="flex items-center gap-2 text-sm font-medium text-gray-600"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to Albums
              </button>
              {selectedAlbum.createdByUserId === currentUser?.id && (
                <button
                  onClick={() => deleteAlbumMutation.mutate(selectedAlbum.id)}
                  className="rounded-full bg-red-100 p-2 text-red-500 hover:bg-red-200 transition-colors"
                  data-testid="button-delete-album"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            
            <div className="mb-4">
              <h3 className="font-heading text-lg font-bold text-gray-900">{selectedAlbum.name}</h3>
              {selectedAlbum.description && (
                <p className="text-sm text-gray-500 mt-1">{selectedAlbum.description}</p>
              )}
            </div>

            <input
              ref={albumPhotoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAlbumPhotoUpload}
            />
            
            <button
              onClick={() => albumPhotoInputRef.current?.click()}
              disabled={isUploadingAlbumPhoto}
              className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 p-4 text-gray-500 hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
              data-testid="button-upload-photo"
            >
              {isUploadingAlbumPhoto ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Camera className="h-5 w-5" />
                  Add Photos
                </>
              )}
            </button>

            {albumPhotos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <Camera className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">No photos yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {albumPhotos.map((photo: any) => (
                  <div 
                    key={photo.id}
                    className="relative aspect-square rounded-lg overflow-hidden group"
                  >
                    <img 
                      src={photo.photoUrl} 
                      alt={photo.caption || "Photo"}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => window.open(photo.photoUrl, '_blank')}
                    />
                    <button
                      onClick={() => deletePhotoMutation.mutate(photo.id)}
                      className="absolute top-1 right-1 rounded-full bg-red-500 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      data-testid={`button-delete-photo-${photo.id}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Album Modal */}
        {showCreateAlbumModal && (
          <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h3 className="font-heading text-lg font-bold">Create Album</h3>
                <button 
                  onClick={() => {
                    setShowCreateAlbumModal(false);
                    setAlbumName("");
                    setAlbumDescription("");
                  }}
                  className="rounded-full bg-gray-100 p-2"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-1 block">Album Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Summer Beach Trip"
                    className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-primary focus:outline-none"
                    value={albumName}
                    onChange={(e) => setAlbumName(e.target.value)}
                    data-testid="input-album-name"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-1 block">Description (optional)</label>
                  <textarea
                    placeholder="What's this album about?"
                    rows={2}
                    className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-primary focus:outline-none resize-none"
                    value={albumDescription}
                    onChange={(e) => setAlbumDescription(e.target.value)}
                    data-testid="input-album-description"
                  />
                </div>
                <button
                  onClick={() => createAlbumMutation.mutate()}
                  disabled={!albumName.trim() || createAlbumMutation.isPending}
                  className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white disabled:opacity-50"
                  data-testid="button-save-album"
                >
                  {createAlbumMutation.isPending ? "Creating..." : "Create Album"}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "trips" && (
          <div className="flex-1 overflow-y-auto p-4 pb-20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold">Trip Plans</h3>
              <button
                onClick={() => setShowCreateTripModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"
                data-testid="button-create-trip"
              >
                <Plus className="h-4 w-4" />
                New Trip
              </button>
            </div>

            {podTrips.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Plane className="h-12 w-12 mb-2 opacity-20" />
                <p className="text-sm">No trips planned yet.</p>
                <button 
                  onClick={() => setShowCreateTripModal(true)}
                  className="mt-4 text-primary font-bold text-sm"
                  data-testid="button-plan-first-trip"
                >
                  Plan your first trip
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {podTrips.map((trip: any) => (
                  <button
                    key={trip.id}
                    onClick={() => setLocation(`/trip/${trip.id}`)}
                    className="w-full bg-white rounded-2xl border border-gray-100 p-4 text-left hover:shadow-md transition-shadow"
                    data-testid={`card-trip-${trip.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <Plane className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-heading font-bold text-charcoal truncate">{trip.name}</h4>
                        <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="truncate">{trip.destination}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {format(new Date(trip.startDate), "MMM d")} - {format(new Date(trip.endDate), "MMM d, yyyy")}
                          </span>
                        </div>
                      </div>
                      {trip.aiSummary && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 rounded-full">
                          <Sparkles className="h-3 w-3 text-purple-500" />
                          <span className="text-xs text-purple-600 font-medium">AI</span>
                        </div>
                      )}
                    </div>
                    {trip.items && trip.items.length > 0 && (
                      <div className="mt-3 text-xs text-gray-500">
                        {trip.items.length} activities planned
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {showCreateTripModal && (
          <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h3 className="font-heading text-lg font-bold">Plan a Trip</h3>
                <button 
                  onClick={() => {
                    setShowCreateTripModal(false);
                    setTripName("");
                    setTripDestination("");
                    setTripStartDate("");
                    setTripEndDate("");
                  }}
                  className="rounded-full bg-gray-100 p-2"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-1 block">Trip Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Summer Beach Vacation"
                    className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-primary focus:outline-none"
                    value={tripName}
                    onChange={(e) => setTripName(e.target.value)}
                    data-testid="input-trip-name"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-1 block">Destination</label>
                  <input
                    type="text"
                    placeholder="e.g., San Diego, CA"
                    className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-primary focus:outline-none"
                    value={tripDestination}
                    onChange={(e) => setTripDestination(e.target.value)}
                    data-testid="input-trip-destination"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-bold text-gray-700 mb-1 block">Start Date</label>
                    <input
                      type="date"
                      className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-primary focus:outline-none"
                      value={tripStartDate}
                      onChange={(e) => setTripStartDate(e.target.value)}
                      data-testid="input-trip-start"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-gray-700 mb-1 block">End Date</label>
                    <input
                      type="date"
                      className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-primary focus:outline-none"
                      value={tripEndDate}
                      onChange={(e) => setTripEndDate(e.target.value)}
                      min={tripStartDate}
                      data-testid="input-trip-end"
                    />
                  </div>
                </div>
                <button
                  onClick={() => createTripMutation.mutate()}
                  disabled={!tripName.trim() || !tripDestination.trim() || !tripStartDate || !tripEndDate || createTripMutation.isPending}
                  className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white disabled:opacity-50"
                  data-testid="button-save-trip"
                >
                  {createTripMutation.isPending ? "Creating..." : "Create Trip"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {pod && currentUser && (
        <PodSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          pod={pod}
          members={members}
          currentUserId={currentUser.id}
          onPodDeleted={() => {
            setShowSettingsModal(false);
            setLocation("/pods");
          }}
          onPodLeft={() => {
            setShowSettingsModal(false);
            setLocation("/pods");
          }}
        />
      )}
    </div>
  );
}
