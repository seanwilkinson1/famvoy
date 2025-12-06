import { useRoute, useLocation } from "wouter";
import { ExperienceCard } from "@/components/shared/ExperienceCard";
import { CommentsSection } from "@/components/shared/CommentsSection";
import { ChevronLeft, Heart, Clock, DollarSign, Users, MapPin, Share2, Navigation, Plus, X, FolderPlus } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatExperience, type ExperienceWithCreator } from "@/lib/types";
import { useClerkAuth } from "@/hooks/useAuth";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Icon } from "leaflet";
import "leaflet/dist/leaflet.css";
import { toast } from "sonner";

const experienceIcon = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function ExperienceDetails() {
  const [match, params] = useRoute("/experience/:id");
  const [, setLocation] = useLocation();
  const [isSaved, setIsSaved] = useState(false);
  const [showAddToPodModal, setShowAddToPodModal] = useState(false);
  const { user } = useClerkAuth();
  const queryClient = useQueryClient();

  const { data: experience } = useQuery<ExperienceWithCreator | null>({
    queryKey: ["experience", params?.id],
    queryFn: () => params?.id ? api.experiences.getById(parseInt(params.id)) as Promise<ExperienceWithCreator> : null,
    enabled: !!match && !!params?.id,
  });

  const { data: allExperiences = [] } = useQuery({
    queryKey: ["experiences"],
    queryFn: api.experiences.getAll,
  });

  const { data: userPods = [] } = useQuery({
    queryKey: ["userPods", user?.id],
    queryFn: () => user?.id ? api.users.getPods(user.id) : [],
    enabled: !!user?.id,
  });

  const addToPodMutation = useMutation({
    mutationFn: ({ podId, experienceId }: { podId: number; experienceId: number }) => 
      api.pods.addExperience(podId, experienceId),
    onSuccess: (_, { podId }) => {
      queryClient.invalidateQueries({ queryKey: ["podExperiences", podId] });
      setShowAddToPodModal(false);
      toast.success("Experience added to pod!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (!match || !experience) return null;

  const similar = allExperiences.filter((e) => e.id !== experience.id);
  const formattedSimilar = similar.map(exp => formatExperience(exp as any));

  return (
    <div className="min-h-screen bg-background pb-24 relative z-50">
      {/* Hero Image */}
      <div className="relative h-72 w-full">
        <img
          src={experience.image}
          alt={experience.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Top Nav */}
        <div className="absolute top-0 left-0 right-0 p-6 pt-14 flex justify-between items-center">
          <button 
            onClick={() => setLocation("/")}
            className="rounded-full bg-white/20 backdrop-blur-md p-2 text-white hover:bg-white/30 transition-colors"
            data-testid="button-back"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="flex gap-3">
            {user && (
              <button 
                onClick={() => setShowAddToPodModal(true)}
                className="rounded-full bg-white/20 backdrop-blur-md p-2 text-white hover:bg-white/30 transition-colors" 
                data-testid="button-add-to-pod"
              >
                <FolderPlus className="h-5 w-5" />
              </button>
            )}
            <button 
              onClick={async () => {
                if (navigator.share) {
                  try {
                    await navigator.share({
                      title: experience.title,
                      text: `Check out this family experience: ${experience.title}`,
                      url: window.location.href,
                    });
                  } catch (err) {
                    console.log('Share cancelled');
                  }
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Link copied to clipboard!');
                }
              }}
              className="rounded-full bg-white/20 backdrop-blur-md p-2 text-white hover:bg-white/30 transition-colors" 
              data-testid="button-share"
            >
              <Share2 className="h-5 w-5" />
            </button>
            <button 
              onClick={() => setIsSaved(!isSaved)}
              className="rounded-full bg-white/20 backdrop-blur-md p-2 text-white hover:bg-white/30 transition-colors"
              data-testid="button-save"
            >
              <Heart className={cn("h-5 w-5", isSaved ? "fill-red-500 text-red-500" : "text-white")} />
            </button>
          </div>
        </div>

        {/* Title Overlay */}
        <div className="absolute bottom-0 left-0 p-6">
          <span className="inline-block rounded-md bg-primary/90 px-2 py-1 text-xs font-bold text-white backdrop-blur-sm mb-2">
            {experience.category}
          </span>
          <h1 className="font-heading text-3xl font-bold text-white leading-tight" data-testid="text-title">
            {experience.title}
          </h1>
        </div>
      </div>

      {/* Content Container */}
      <div className="relative -mt-6 rounded-t-[32px] bg-background px-6 pt-8">
        
        {/* Family Row */}
        <div className="mb-8 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => experience.creator && setLocation(`/family/${experience.creator.id}`)}
          >
            <img
              src={experience.creator?.avatar || "https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=400"}
              alt={experience.creator?.name || "Family"}
              className="h-10 w-10 rounded-full object-cover ring-2 ring-white shadow-sm"
            />
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Shared by</p>
              <p className="text-sm font-bold text-gray-900" data-testid="text-creator-name">
                {experience.creator?.name || "A Family"}
              </p>
            </div>
          </div>
          <button className="rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary" data-testid="button-follow">
            Follow
          </button>
        </div>

        {/* Quick Stats */}
        <div className="mb-8 grid grid-cols-4 gap-2 rounded-2xl bg-gray-50 p-4">
          {[
            { icon: Clock, label: "Duration", val: experience.duration },
            { icon: DollarSign, label: "Cost", val: experience.cost },
            { icon: Users, label: "Ages", val: experience.ages },
            { icon: MapPin, label: "Dist", val: "2.4mi" },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <stat.icon className="mb-1 h-5 w-5 text-primary" />
              <span className="text-[10px] font-medium text-gray-400 uppercase">{stat.label}</span>
              <span className="text-xs font-bold text-gray-900">{stat.val}</span>
            </div>
          ))}
        </div>

        {/* Map Preview */}
        <div className="mb-8 overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
          <div className="relative h-40 w-full">
            <MapContainer
              center={[experience.locationLat, experience.locationLng]}
              zoom={14}
              scrollWheelZoom={false}
              className="h-full w-full z-0"
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker 
                position={[experience.locationLat, experience.locationLng]}
                icon={experienceIcon}
              >
                <Popup>
                  <div className="text-center">
                    <p className="font-bold text-sm">{experience.title}</p>
                    <p className="text-xs text-gray-500">{experience.locationName}</p>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          </div>
          <div className="bg-white p-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-gray-900">{experience.locationName}</span>
            </div>
            <a 
              href={`https://www.google.com/maps/dir/?api=1&destination=${experience.locationLat},${experience.locationLng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-bold text-primary"
              data-testid="button-directions"
            >
              <Navigation className="h-3 w-3" />
              Get Directions
            </a>
          </div>
        </div>

        {/* What We Loved */}
        <section className="mb-8">
          <h2 className="mb-3 font-heading text-xl font-bold text-gray-900">What We Loved</h2>
          <p className="text-base leading-relaxed text-gray-600">
            {experience.description || "This was honestly such a hidden gem! The kids loved the interactive exhibits, and we spent way more time here than expected. Highly recommend bringing a packed lunch as the cafe was a bit crowded."}
          </p>
        </section>

        {/* Good to Know */}
        <section className="mb-8">
          <h2 className="mb-3 font-heading text-xl font-bold text-gray-900">Good to Know</h2>
          <ul className="space-y-2">
            {(experience.tips || [
              "Stroller friendly paths throughout",
              "Restrooms located near the entrance",
              "Best time to visit is early morning",
              "Parking is free on weekends"
            ]).map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-secondary-foreground/50 flex-shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </section>

        {/* Reviews & Comments */}
        <CommentsSection 
          experienceId={experience.id} 
          currentUserId={user?.id}
        />

        {/* Similar Experiences */}
        {formattedSimilar.length > 0 && (
          <section>
            <h2 className="mb-4 font-heading text-xl font-bold text-gray-900">Similar Experiences</h2>
            <ScrollArea className="-mx-6 w-[calc(100%+48px)] px-6 pb-4">
               <div className="flex gap-4 w-max">
                 {formattedSimilar.map(exp => (
                   <ExperienceCard key={exp.id} experience={exp} horizontal className="w-[240px]" />
                 ))}
               </div>
               <ScrollBar orientation="horizontal" className="hidden" />
            </ScrollArea>
          </section>
        )}
      </div>

      {/* Add to Pod Modal */}
      {showAddToPodModal && (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-heading text-lg font-bold">Add to Pod</h3>
              <button 
                onClick={() => setShowAddToPodModal(false)}
                className="rounded-full bg-gray-100 p-2"
                data-testid="button-close-add-pod-modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-3 max-h-[60vh]">
              {userPods.filter(p => !p.isDirect).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">You're not a member of any group pods yet</p>
                  <button 
                    onClick={() => {
                      setShowAddToPodModal(false);
                      setLocation("/pods");
                    }}
                    className="text-primary font-bold text-sm"
                  >
                    Browse Pods
                  </button>
                </div>
              ) : userPods.filter(p => !p.isDirect).map((pod) => (
                <div 
                  key={pod.id}
                  onClick={() => addToPodMutation.mutate({ podId: pod.id, experienceId: experience.id })}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                  data-testid={`pod-item-${pod.id}`}
                >
                  <img 
                    src={pod.image || 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400'} 
                    alt={pod.name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 line-clamp-1">{pod.name}</p>
                    <p className="text-xs text-gray-500 line-clamp-1">{pod.description}</p>
                  </div>
                  <Plus className="h-5 w-5 text-primary" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
