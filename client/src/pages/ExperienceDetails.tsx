import { useRoute, useLocation } from "wouter";
import { ExperienceCard } from "@/components/shared/ExperienceCard";
import { CommentsSection } from "@/components/shared/CommentsSection";
import { ChevronLeft, Heart, Clock, DollarSign, Users, MapPin, Share2, Navigation } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatExperience } from "@/lib/types";
import { useClerkAuth } from "@/hooks/useAuth";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Icon } from "leaflet";
import "leaflet/dist/leaflet.css";

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
  const { user } = useClerkAuth();

  const { data: experience } = useQuery({
    queryKey: ["experience", params?.id],
    queryFn: () => params?.id ? api.experiences.getById(parseInt(params.id)) : null,
    enabled: !!match && !!params?.id,
  });

  const { data: allExperiences = [] } = useQuery({
    queryKey: ["experiences"],
    queryFn: api.experiences.getAll,
  });

  if (!match || !experience) return null;

  const similar = allExperiences.filter((e) => e.id !== experience.id);
  const formattedSimilar = similar.map(exp => 
    formatExperience(exp, "Family", "https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=400")
  );

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
          <div className="flex items-center gap-3">
            <img
              src="https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=400"
              alt="Family"
              className="h-10 w-10 rounded-full object-cover ring-2 ring-white shadow-sm"
            />
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Shared by</p>
              <p className="text-sm font-bold text-gray-900">The Family</p>
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
    </div>
  );
}
