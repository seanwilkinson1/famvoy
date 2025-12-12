import { ExperienceCard } from "@/components/shared/ExperienceCard";
import { ActivityFeed } from "@/components/shared/ActivityFeed";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatExperience } from "@/lib/types";
import { useState, useEffect, useMemo } from "react";
import { MapPin, Users } from "lucide-react";
import { Link } from "wouter";

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

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 px-6 pt-14 pb-4 backdrop-blur-md">
        <p className="text-sm font-medium text-gray-500">Good morning,</p>
        <h1 className="font-heading text-2xl font-bold text-gray-900">
          {currentUser?.name || "Loading..."} 👋
        </h1>
        
        {/* Main Tabs for Discover / Following */}
        <Tabs defaultValue="discover" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="discover" data-testid="tab-discover">Discover</TabsTrigger>
            <TabsTrigger value="following" data-testid="tab-following">
              <Users className="h-4 w-4 mr-1" />
              Following
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="discover" className="mt-4">
            {/* Filters */}
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex w-max space-x-3 pb-4">
                {filters.map((filter) => {
                  const isActive = activeFilter === filter;
                  return (
                    <button
                      key={filter}
                      onClick={() => setActiveFilter(filter)}
                      className={cn(
                        "rounded-full px-4 py-2 text-sm font-medium transition-all active:scale-95",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                          : "bg-white text-gray-600 shadow-sm hover:bg-gray-50"
                      )}
                      data-testid={`filter-${filter.toLowerCase().replace(/\s/g, '-')}`}
                    >
                      {filter === "Nearby" && <MapPin className="inline h-3 w-3 mr-1" />}
                      {filter}
                    </button>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" className="hidden" />
            </ScrollArea>

            <div className="space-y-8">
              {isLoading ? (
                <div className="text-center py-8 text-gray-400">Loading experiences...</div>
              ) : (
                <>
                  {/* Suggestions - only show when "All" filter is active */}
                  {activeFilter === "All" && (
                    <section>
                      <div className="mb-4 flex items-center justify-between">
                        <h2 className="font-heading text-lg font-bold text-gray-900">Suggestions for Today</h2>
                        <button className="text-sm font-medium text-primary" data-testid="button-see-all">See all</button>
                      </div>
                      <ScrollArea className="w-full whitespace-nowrap">
                        <div className="flex w-max space-x-4 pb-4">
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
                    <h2 className="mb-4 font-heading text-lg font-bold text-gray-900">
                      {activeFilter === "All" 
                        ? "Popular with Families Like Yours" 
                        : `${activeFilter} Experiences`}
                    </h2>
                    {activeFilter === "Nearby" && locationError && (
                      <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                        <MapPin className="inline h-4 w-4 mr-1" />
                        Location access denied. Enable location to see nearby experiences.
                      </div>
                    )}
                    {activeFilter === "Nearby" && !userLocation && !locationError && (
                      <div className="mb-4 rounded-xl bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
                        <MapPin className="inline h-4 w-4 mr-1" />
                        Getting your location...
                      </div>
                    )}
                    {filteredExperiences.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        No experiences match this filter
                      </div>
                    ) : (
                      <div className="grid gap-6">
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
          
          <TabsContent value="following" className="mt-4">
            {followingLoading ? (
              <div className="text-center py-8 text-gray-400">Loading...</div>
            ) : formattedFollowingExperiences.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <h3 className="font-heading text-lg font-bold text-gray-900 mb-2">No posts yet</h3>
                <p className="text-gray-500 text-sm mb-4">
                  Follow families to see their experiences here
                </p>
                <Link href="/explore">
                  <button className="rounded-full bg-primary px-6 py-2.5 font-bold text-white">
                    Find Families
                  </button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {formattedFollowingExperiences.map((exp: any) => (
                  <div key={exp.id}>
                    {/* Creator info */}
                    <Link href={`/family/${exp.creator?.id}`}>
                      <div className="flex items-center gap-3 mb-3 cursor-pointer">
                        {exp.creator?.profileImageUrl || exp.creator?.avatar ? (
                          <img
                            src={exp.creator.profileImageUrl || exp.creator.avatar}
                            alt={exp.creator.name || "User"}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm">
                            {(exp.creator?.name || "?").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{exp.creator?.name || "Unknown"}</p>
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
