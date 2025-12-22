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
  const [activeTab, setActiveTab] = useState<"posts" | "experiences" | "albums" | "trips">("posts");
  const [postInput, setPostInput] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [showExperiencePicker, setShowExperiencePicker] = useState(false);
  const [showAddExperienceModal, setShowAddExperienceModal] = useState(false);
  const [showCreateAlbumModal, setShowCreateAlbumModal] = useState(false);
  const [showCreateTripModal, setShowCreateTripModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<any | null>(null);
  const [albumName, setAlbumName] = useState("");
  const [albumDescription, setAlbumDescription] = useState("");
  const [linkingTripId, setLinkingTripId] = useState<number | null>(null);
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

  const { data: userTrips = [] } = useQuery({
    queryKey: ["userTrips"],
    queryFn: () => api.users.getMyTrips(),
  });

  const unlinkedTrips = userTrips.filter((trip: any) => !trip.podId);

  const { data: podPosts = [], refetch: refetchPosts } = useQuery({
    queryKey: ["podPosts", podId],
    queryFn: () => api.pods.getPosts(podId),
    enabled: podId > 0,
  });

  const createPostMutation = useMutation({
    mutationFn: (data: { content: string; imageUrl?: string }) => api.pods.createPost(podId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["podPosts", podId] });
      setPostInput("");
      toast.success("Post shared!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const linkTripMutation = useMutation({
    mutationFn: (tripId: number) => {
      setLinkingTripId(tripId);
      return api.trips.linkToPod(tripId, podId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["podTrips", podId] });
      queryClient.invalidateQueries({ queryKey: ["userTrips"] });
      setShowCreateTripModal(false);
      setLinkingTripId(null);
      toast.success("Trip linked to pod!");
    },
    onError: (error: Error) => {
      setLinkingTripId(null);
      toast.error(error.message);
    },
  });

  const deleteTripMutation = useMutation({
    mutationFn: (tripId: number) => api.trips.delete(tripId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["podTrips", podId] });
      toast.success("Trip deleted");
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
    <div className="flex h-screen flex-col bg-background pb-20 lg:pb-0">
      {/* Header */}
      <div className="border-b border-gray-100 bg-white px-6 pt-14 lg:pt-6 pb-4 shadow-sm z-10 lg:max-w-5xl lg:mx-auto lg:w-full lg:rounded-b-none">
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
          {["posts", "experiences", "albums", "trips"].map((t) => (
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
        {activeTab === "posts" && (
          <div className="flex h-full flex-col">
            {/* Post Input */}
            <div className="border-b border-gray-100 bg-white p-4">
              <div className="flex items-start gap-3">
                <img 
                  src={currentUser?.avatar || 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=400'} 
                  className="h-10 w-10 rounded-full object-cover" 
                  alt="You" 
                />
                <div className="flex-1">
                  <textarea
                    placeholder="Share an update with the pod..."
                    className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm outline-none focus:border-primary focus:bg-white transition-colors"
                    rows={2}
                    value={postInput}
                    onChange={(e) => setPostInput(e.target.value)}
                    data-testid="input-post"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => postInput.trim() && createPostMutation.mutate({ content: postInput.trim() })}
                      disabled={createPostMutation.isPending || !postInput.trim()}
                      className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm active:scale-95 transition-transform disabled:opacity-50"
                      data-testid="button-post"
                    >
                      {createPostMutation.isPending ? "Posting..." : "Post"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Posts Feed */}
            <div className="flex-1 space-y-4 p-4">
              {podPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                  <p className="text-sm">No posts yet. Share something with the pod!</p>
                </div>
              ) : podPosts.map((post: any) => (
                <div key={post.id} className="rounded-2xl bg-white p-4 shadow-sm" data-testid={`post-${post.id}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <img 
                      src={post.user?.avatar || 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=400'} 
                      className="h-10 w-10 rounded-full object-cover" 
                      alt={post.user?.name || 'Family'} 
                    />
                    <div>
                      <p className="font-bold text-sm text-gray-900">{post.user?.name || 'Family'}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(post.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{post.content}</p>
                  {post.imageUrl && (
                    <img 
                      src={post.imageUrl} 
                      alt="Post image" 
                      className="mt-3 w-full rounded-xl object-cover max-h-64"
                    />
                  )}
                </div>
              ))}
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
                  {pod?.creatorId === currentUser?.id && (
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
                  )}
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
              <h3 className="font-heading text-lg font-bold">Pod Trips</h3>
              <button
                onClick={() => setShowCreateTripModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"
                data-testid="button-link-trip"
              >
                <Plus className="h-4 w-4" />
                Link Trip
              </button>
            </div>

            {podTrips.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Plane className="h-12 w-12 mb-2 opacity-20" />
                <p className="text-sm">No trips linked yet.</p>
                <p className="text-xs mt-1 text-gray-300">Create trips from the Trips tab, then link them here.</p>
                <button 
                  onClick={() => setShowCreateTripModal(true)}
                  className="mt-4 text-primary font-bold text-sm"
                  data-testid="button-link-first-trip"
                >
                  Link a trip
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {podTrips.map((trip: any) => (
                  <div key={trip.id} className="relative">
                    <button
                      onClick={() => setLocation(`/trip/${trip.id}`)}
                      className="w-full bg-white rounded-2xl border border-gray-100 p-4 text-left hover:shadow-md transition-shadow"
                      data-testid={`card-trip-${trip.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                          <Plane className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h4 className="font-heading font-bold text-charcoal truncate">{trip.name}</h4>
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
                    {pod?.creatorId === currentUser?.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Are you sure you want to delete this trip?")) {
                            deleteTripMutation.mutate(trip.id);
                          }
                        }}
                        className="absolute top-2 right-2 rounded-full bg-red-500 p-1.5 text-white shadow-md hover:bg-red-600 transition-colors z-10"
                        data-testid={`button-delete-trip-${trip.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {showCreateTripModal && (
          <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h3 className="font-heading text-lg font-bold">Link a Trip</h3>
                <button 
                  onClick={() => setShowCreateTripModal(false)}
                  className="rounded-full bg-gray-100 p-2"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                {unlinkedTrips.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Plane className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No trips available to link.</p>
                    <p className="text-xs mt-1">Create a trip from the Trips tab first.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-500">Select a trip to link to this pod:</p>
                    {unlinkedTrips.map((trip: any) => (
                      <button
                        key={trip.id}
                        onClick={() => linkTripMutation.mutate(trip.id)}
                        disabled={linkingTripId !== null}
                        className={cn(
                          "w-full bg-gray-50 rounded-xl p-3 text-left transition-colors border border-gray-100",
                          linkingTripId === trip.id ? "opacity-70" : "hover:bg-gray-100",
                          linkingTripId !== null && linkingTripId !== trip.id && "opacity-50"
                        )}
                        data-testid={`button-link-trip-${trip.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Plane className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-charcoal truncate">{trip.name}</h4>
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{trip.destination}</span>
                            </div>
                          </div>
                          {linkingTripId === trip.id ? (
                            <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Plus className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      </button>
                    ))}
                  </>
                )}
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
