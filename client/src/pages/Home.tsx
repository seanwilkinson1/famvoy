import { ExperienceCard } from "@/components/shared/ExperienceCard";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatExperience } from "@/lib/types";
import { useState, useEffect, useMemo } from "react";
import { MapPin, Users, Sparkles, Clock, Home as HomeIcon, TreePine, Baby, Sun, Building } from "lucide-react";
import { Link } from "wouter";

const filterIcons: Record<string, typeof MapPin> = {
  "All": Sparkles,
  "Nearby": MapPin,
  "Free": Sun,
  "1–2 hrs": Clock,
  "Indoor": Building,
  "Outdoor": TreePine,
  "Toddler-friendly": Baby,
};

const filters = ["All", "Nearby", "Free", "1–2 hrs", "Indoor", "Outdoor", "Toddler-friendly"];

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function isToddlerFriendly(ages: string): boolean {
  const lower = ages.toLowerCase();
  if (lower.includes("all ages") || lower.includes("toddler")) return true;
  const match = ages.match(/(\d+)/);
  if (match) {
    const minAge = parseInt(match[1]);
    return minAge <= 3;
  }
  return false;
}

function parseDurationToHours(duration: string): number | null {
  const normalized = duration.toLowerCase().replace(/[–—]/g, '-');
  
  const rangeMatch = normalized.match(/([\d.]+)\s*-\s*([\d.]+)\s*(hrs?|hours?|mins?|minutes?)/);
  if (rangeMatch) {
    const avg = (parseFloat(rangeMatch[1]) + parseFloat(rangeMatch[2])) / 2;
    if (rangeMatch[3].startsWith('min')) return avg / 60;
    return avg;
  }
  
  const singleMatch = normalized.match(/([\d.]+)\s*(hrs?|hours?|mins?|minutes?)/);
  if (singleMatch) {
    const val = parseFloat(singleMatch[1]);
    if (singleMatch[2].startsWith('min')) return val / 60;
    return val;
  }
  
  return null;
}

function isDurationInRange(duration: string): boolean {
  const hours = parseDurationToHours(duration);
  if (hours === null) return false;
  return hours >= 1 && hours <= 2;
}

export default function Home() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    if (activeFilter === "Nearby" && !userLocation && !locationError && !locationLoading) {
      if (!navigator.geolocation) {
        setLocationError(true);
        return;
      }
      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationLoading(false);
        },
        () => {
          setLocationError(true);
          setLocationLoading(false);
        }
      );
    }
  }, [activeFilter, userLocation, locationError, locationLoading]);

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: api.users.getMe,
  });

  const { data: experiences = [], isLoading } = useQuery({
    queryKey: ["experiences"],
    queryFn: api.experiences.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: followingExperiences = [], isLoading: followingLoading } = useQuery({
    queryKey: ["followingExperiences"],
    queryFn: api.following.getExperiences,
    enabled: !!currentUser,
  });

  const formattedExperiences = experiences.map(exp => formatExperience(exp as any));
  const formattedFollowingExperiences = followingExperiences.map(exp => ({
    ...formatExperience(exp as any),
    creator: exp.creator,
  }));

  const filteredExperiences = useMemo(() => {
    if (activeFilter === "All") return formattedExperiences;

    return formattedExperiences.filter((exp) => {
      switch (activeFilter) {
        case "Nearby":
          if (!userLocation) return false;
          const distance = getDistanceKm(
            userLocation.lat, userLocation.lng,
            exp.locationLat, exp.locationLng
          );
          return distance <= 25;
        case "Free":
          return exp.cost === "Free";
        case "1–2 hrs":
          return isDurationInRange(exp.duration);
        case "Indoor":
          return exp.category?.toLowerCase() === "indoor";
        case "Outdoor":
          return exp.category?.toLowerCase() === "outdoor";
        case "Toddler-friendly":
          return isToddlerFriendly(exp.ages);
        default:
          return true;
      }
    });
  }, [formattedExperiences, activeFilter, userLocation]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="min-h-screen bg-background bg-pattern pb-32 md:pb-8">
      {/* Header with playful greeting */}
      <div className="sticky top-0 z-40 glass px-6 pt-14 md:pt-8 pb-4 md:max-w-6xl md:mx-auto">
        <div className="relative">
          <p className="text-sm font-semibold text-primary/80">{getGreeting()}</p>
          <h1 className="font-heading text-3xl font-extrabold text-gray-900 relative inline-block">
            {currentUser?.name || "Loading..."}
            <span className="ml-2 inline-block wave-animation">👋</span>
            {/* Decorative dots */}
            <span className="absolute -top-1 -right-3 h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="absolute -top-2 -right-6 h-1.5 w-1.5 rounded-full bg-secondary" />
          </h1>
        </div>
        
        {/* Main Tabs for Discover / Following */}
        <Tabs defaultValue="discover" className="mt-5">
          <TabsList className="grid w-full grid-cols-2 p-1 bg-gray-100/80 rounded-2xl">
            <TabsTrigger 
              value="discover" 
              data-testid="tab-discover"
              className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-semibold"
            >
              <Sparkles className="h-4 w-4 mr-1.5" />
              Discover
            </TabsTrigger>
            <TabsTrigger 
              value="following" 
              data-testid="tab-following"
              className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-semibold"
            >
              <Users className="h-4 w-4 mr-1.5" />
              Following
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="discover" className="mt-5 tab-content-enter">
            {/* Enhanced Filters with icons */}
            <ScrollArea className="w-full whitespace-nowrap -mx-6 px-6">
              <div className="flex w-max space-x-2.5 pb-4">
                {filters.map((filter) => {
                  const isActive = activeFilter === filter;
                  const FilterIcon = filterIcons[filter] || Sparkles;
                  return (
                    <button
                      key={filter}
                      onClick={() => setActiveFilter(filter)}
                      className={cn(
                        "filter-pill flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-semibold",
                        isActive
                          ? "filter-active"
                          : "bg-white text-gray-600 shadow-sm hover:shadow-md hover:scale-[1.02]"
                      )}
                      data-testid={`filter-${filter.toLowerCase().replace(/\s/g, '-')}`}
                    >
                      <FilterIcon className={cn("h-4 w-4", isActive && "animate-pulse")} />
                      {filter}
                    </button>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" className="hidden" />
            </ScrollArea>

            <div className="space-y-8">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-r from-primary to-secondary animate-spin opacity-20" />
                    <div className="absolute inset-2 h-12 w-12 rounded-full bg-white" />
                    <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-primary wave-animation" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-gray-400">Finding adventures...</p>
                </div>
              ) : (
                <>
                  {/* Suggestions - only show when "All" filter is active */}
                  {activeFilter === "All" && (
                    <section>
                      <div className="mb-5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-1 rounded-full gradient-primary" />
                          <h2 className="font-heading text-xl font-bold text-gray-900">Suggestions for Today</h2>
                        </div>
                        <button className="text-sm font-semibold text-primary hover:underline" data-testid="button-see-all">See all</button>
                      </div>
                      <ScrollArea className="w-full whitespace-nowrap -mx-6 px-6">
                        <div className="flex w-max space-x-5 pb-4">
                          {formattedExperiences.slice(0, 3).map((exp) => (
                            <ExperienceCard key={exp.id} experience={exp} horizontal />
                          ))}
                        </div>
                        <ScrollBar orientation="horizontal" className="hidden" />
                      </ScrollArea>
                    </section>
                  )}

                  {/* Results section */}
                  <section>
                    <div className="mb-5 flex items-center gap-2">
                      <div className="h-8 w-1 rounded-full gradient-sunset" />
                      <h2 className="font-heading text-xl font-bold text-gray-900">
                        {activeFilter === "All" 
                          ? "Popular with Families Like Yours" 
                          : `${activeFilter} Experiences`}
                      </h2>
                    </div>
                    {activeFilter === "Nearby" && locationError && (
                      <div className="mb-4 rounded-2xl bg-amber-50 border border-amber-100 p-4 text-sm text-amber-800 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                          <MapPin className="h-5 w-5 text-amber-600" />
                        </div>
                        <span>Location access denied. Enable location to see nearby experiences.</span>
                      </div>
                    )}
                    {activeFilter === "Nearby" && !userLocation && !locationError && (
                      <div className="mb-4 rounded-2xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-800 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 animate-pulse">
                          <MapPin className="h-5 w-5 text-blue-600" />
                        </div>
                        <span>Getting your location...</span>
                      </div>
                    )}
                    {filteredExperiences.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                          <Sparkles className="h-8 w-8 text-gray-300" />
                        </div>
                        <p className="text-gray-400 font-medium">No experiences match this filter</p>
                      </div>
                    ) : (
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filteredExperiences.map((exp) => (
                          <ExperienceCard key={`filtered-${exp.id}`} experience={exp} />
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="following" className="mt-5 tab-content-enter">
            {followingLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-r from-primary to-secondary animate-spin opacity-20" />
                  <div className="absolute inset-2 h-12 w-12 rounded-full bg-white" />
                  <Users className="absolute inset-0 m-auto h-6 w-6 text-primary wave-animation" />
                </div>
                <p className="mt-4 text-sm font-medium text-gray-400">Loading updates...</p>
              </div>
            ) : formattedFollowingExperiences.length === 0 ? (
              <div className="text-center py-16">
                <div className="mx-auto h-20 w-20 rounded-full gradient-sky flex items-center justify-center mb-5 shadow-lg">
                  <Users className="h-10 w-10 text-white" />
                </div>
                <h3 className="font-heading text-xl font-bold text-gray-900 mb-2">No posts yet</h3>
                <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
                  Follow families to see their experiences and adventures here
                </p>
                <Link href="/explore">
                  <button className="rounded-2xl gradient-primary px-8 py-3 font-bold text-white shadow-lg shadow-primary/30 hover:shadow-xl transition-shadow">
                    Find Families
                  </button>
                </Link>
              </div>
            ) : (
              <div className="space-y-6 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6 md:space-y-0">
                {formattedFollowingExperiences.map((exp: any) => (
                  <div key={exp.id}>
                    {/* Creator info */}
                    <Link href={`/family/${exp.creator?.id}`}>
                      <div className="flex items-center gap-3 mb-4 cursor-pointer group">
                        <div className="relative">
                          {exp.creator?.profileImageUrl || exp.creator?.avatar ? (
                            <img
                              src={exp.creator.profileImageUrl || exp.creator.avatar}
                              alt={exp.creator.name || "User"}
                              className="h-12 w-12 rounded-full object-cover ring-2 ring-white shadow-md"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-lg ring-2 ring-white shadow-md">
                              {(exp.creator?.name || "?").charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-400 ring-2 ring-white" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 group-hover:text-primary transition-colors">{exp.creator?.name || "Unknown"}</p>
                          <p className="text-xs text-gray-500">shared an experience</p>
                        </div>
                      </div>
                    </Link>
                    <ExperienceCard experience={exp} />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
