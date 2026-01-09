import { ExperienceCard } from "@/components/shared/ExperienceCard";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatExperience } from "@/lib/types";
import { useState, useEffect, useMemo } from "react";
import { MapPin, UsersThree, CaretRight, Sparkle, Fire, Heart } from "@phosphor-icons/react";
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
    staleTime: 5 * 60 * 1000,
  });

  const { data: followingExperiences = [], isLoading: followingLoading } = useQuery({
    queryKey: ["followingExperiences"],
    queryFn: api.following.getExperiences,
    enabled: !!currentUser,
  });

  const { data: suggestedFamilies = [] } = useQuery({
    queryKey: ["suggestedFamilies"],
    queryFn: () => api.families.discover(),
    enabled: !!currentUser,
    staleTime: 5 * 60 * 1000,
  });

  const { data: suggestedPods = [] } = useQuery({
    queryKey: ["suggestedPods"],
    queryFn: api.pods.discover,
    enabled: !!currentUser,
    staleTime: 5 * 60 * 1000,
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
    <div className="min-h-screen bg-background pb-32 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 px-6 pt-14 md:pt-8 pb-4 backdrop-blur-md md:backdrop-blur-none md:max-w-6xl md:mx-auto">
        <p className="text-sm font-medium text-muted-foreground">Good morning,</p>
        <h1 className="font-heading text-3xl font-medium text-foreground tracking-tight">
          {currentUser?.name || "Loading..."} <span className="inline-block animate-fade-in-up">👋</span>
        </h1>
        
        {/* Main Tabs for Discover / Following */}
        <Tabs defaultValue="discover" className="mt-6">
          <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-muted/50 rounded-2xl">
            <TabsTrigger 
              value="discover" 
              className="rounded-xl font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm"
              data-testid="tab-discover"
            >
              Discover
            </TabsTrigger>
            <TabsTrigger 
              value="following"
              className="rounded-xl font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm"
              data-testid="tab-following"
            >
              <UsersThree weight="bold" className="h-4 w-4 mr-1.5" />
              Following
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="discover" className="mt-6">
            {/* Filters */}
            <ScrollArea className="w-full whitespace-nowrap -mx-6 px-6">
              <div className="flex w-max space-x-2 pb-4">
                {filters.map((filter) => {
                  const isActive = activeFilter === filter;
                  return (
                    <button
                      key={filter}
                      onClick={() => setActiveFilter(filter)}
                      className={cn(
                        "rounded-full px-5 py-2.5 text-sm font-semibold transition-all active:scale-95",
                        isActive
                          ? "bg-foreground text-background shadow-lg"
                          : "bg-card text-muted-foreground shadow-sm hover:bg-muted border border-border/50"
                      )}
                      data-testid={`filter-${filter.toLowerCase().replace(/\s/g, '-')}`}
                    >
                      {filter === "Nearby" && <MapPin weight="fill" className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />}
                      {filter}
                    </button>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" className="hidden" />
            </ScrollArea>

            <div className="space-y-10 mt-2">
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">Loading experiences...</div>
              ) : (
                <>
                  {/* Suggestions - only show when "All" filter is active */}
                  {activeFilter === "All" && (
                    <section className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                      <div className="mb-5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkle weight="fill" className="h-5 w-5 text-secondary" />
                          <h2 className="section-title text-xl text-foreground">Suggestions for Today</h2>
                        </div>
                        <button className="text-sm font-semibold text-primary flex items-center gap-0.5 hover:gap-1.5 transition-all" data-testid="button-see-all">
                          See all <CaretRight weight="bold" className="h-4 w-4" />
                        </button>
                      </div>
                      <ScrollArea className="w-full whitespace-nowrap -mx-6 px-6">
                        <div className="flex w-max space-x-4 pb-4">
                          {formattedExperiences.slice(0, 4).map((exp, i) => (
                            <ExperienceCard key={exp.id} experience={exp} horizontal index={i} />
                          ))}
                        </div>
                        <ScrollBar orientation="horizontal" className="hidden" />
                      </ScrollArea>
                    </section>
                  )}

                  {/* Popular with Families - horizontal scroll */}
                  {activeFilter === "All" && (
                    <section className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                      <div className="mb-5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Fire weight="fill" className="h-5 w-5 text-secondary" />
                          <h2 className="section-title text-xl text-foreground">Popular with Families</h2>
                        </div>
                        <button className="text-sm font-semibold text-primary flex items-center gap-0.5 hover:gap-1.5 transition-all" data-testid="button-see-all-popular">
                          See all <CaretRight weight="bold" className="h-4 w-4" />
                        </button>
                      </div>
                      <ScrollArea className="w-full whitespace-nowrap -mx-6 px-6">
                        <div className="flex w-max space-x-4 pb-4">
                          {formattedExperiences.slice(2, 8).map((exp, i) => (
                            <ExperienceCard key={`popular-${exp.id}`} experience={exp} horizontal index={i} />
                          ))}
                        </div>
                        <ScrollBar orientation="horizontal" className="hidden" />
                      </ScrollArea>
                    </section>
                  )}

                  {/* People You Might Know */}
                  {activeFilter === "All" && suggestedFamilies.length > 0 && (
                    <section className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                      <div className="mb-5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Heart weight="fill" className="h-5 w-5 text-secondary" />
                          <h2 className="section-title text-xl text-foreground">People You Might Know</h2>
                        </div>
                        <Link href="/explore">
                          <button className="text-sm font-semibold text-primary flex items-center gap-0.5 hover:gap-1.5 transition-all" data-testid="button-see-all-people">
                            See all <CaretRight weight="bold" className="h-4 w-4" />
                          </button>
                        </Link>
                      </div>
                      <ScrollArea className="w-full whitespace-nowrap -mx-6 px-6">
                        <div className="flex w-max space-x-4 pb-4">
                          {suggestedFamilies.slice(0, 8).map((family, i) => (
                            <Link key={family.id} href={`/family/${family.id}`}>
                              <div 
                                className="w-36 flex-shrink-0 bg-card rounded-3xl p-5 card-shadow hover:card-shadow-hover transition-all cursor-pointer text-center hover:-translate-y-1 animate-fade-in-up"
                                style={{ animationDelay: `${0.3 + i * 0.05}s` }}
                                data-testid={`card-family-${family.id}`}
                              >
                                <Avatar className="h-18 w-18 mx-auto mb-3 ring-3 ring-border/30">
                                  <AvatarImage src={family.avatar || undefined} className="object-cover" />
                                  <AvatarFallback className="bg-coral-gradient text-white text-xl font-semibold">
                                    {(family.name || "?")[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <p className="font-semibold text-foreground text-sm truncate">{family.name}</p>
                                {family.location && (
                                  <p className="text-xs text-muted-foreground truncate mt-1">{family.location}</p>
                                )}
                                {family.kids && (
                                  <p className="text-xs text-muted-foreground/70 mt-1.5 truncate">{family.kids}</p>
                                )}
                              </div>
                            </Link>
                          ))}
                        </div>
                        <ScrollBar orientation="horizontal" className="hidden" />
                      </ScrollArea>
                    </section>
                  )}

                  {/* Pods You Might Like */}
                  {activeFilter === "All" && suggestedPods.length > 0 && (
                    <section className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                      <div className="mb-5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <UsersThree weight="fill" className="h-5 w-5 text-primary" />
                          <h2 className="section-title text-xl text-foreground">Pods You Might Like</h2>
                        </div>
                        <Link href="/pods">
                          <button className="text-sm font-semibold text-primary flex items-center gap-0.5 hover:gap-1.5 transition-all" data-testid="button-see-all-pods">
                            See all <CaretRight weight="bold" className="h-4 w-4" />
                          </button>
                        </Link>
                      </div>
                      <ScrollArea className="w-full whitespace-nowrap -mx-6 px-6">
                        <div className="flex w-max space-x-4 pb-4">
                          {suggestedPods.slice(0, 8).map((pod, i) => (
                            <Link key={pod.id} href={`/pod/${pod.id}`}>
                              <div 
                                className="w-52 flex-shrink-0 bg-card rounded-3xl p-5 card-shadow hover:card-shadow-hover transition-all cursor-pointer hover:-translate-y-1 animate-fade-in-up"
                                style={{ animationDelay: `${0.4 + i * 0.05}s` }}
                                data-testid={`card-pod-${pod.id}`}
                              >
                                <div className="h-14 w-14 rounded-2xl bg-teal-gradient flex items-center justify-center mb-4 shadow-sm">
                                  <UsersThree weight="fill" className="h-7 w-7 text-white" />
                                </div>
                                <p className="font-semibold text-foreground truncate">{pod.name}</p>
                                {pod.description && (
                                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed">{pod.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                                  <span className={cn(
                                    "text-xs font-semibold px-2.5 py-1 rounded-full",
                                    pod.isPublic ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                  )}>
                                    {pod.isPublic ? "Public" : "Private"}
                                  </span>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                        <ScrollBar orientation="horizontal" className="hidden" />
                      </ScrollArea>
                    </section>
                  )}

                  {/* Filtered Results - only show when filter is not "All" */}
                  {activeFilter !== "All" && (
                    <section>
                      <h2 className="mb-5 section-title text-xl text-foreground">
                        {`${activeFilter} Experiences`}
                      </h2>
                      {activeFilter === "Nearby" && locationError && (
                        <div className="mb-4 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 flex items-center gap-2">
                          <MapPin weight="fill" className="h-5 w-5 flex-shrink-0" />
                          Location access denied. Enable location to see nearby experiences.
                        </div>
                      )}
                      {activeFilter === "Nearby" && !userLocation && !locationError && (
                        <div className="mb-4 rounded-2xl bg-primary/5 border border-primary/20 p-4 text-sm text-primary flex items-center gap-2">
                          <MapPin weight="fill" className="h-5 w-5 flex-shrink-0" />
                          Getting your location...
                        </div>
                      )}
                      {filteredExperiences.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          No experiences match this filter
                        </div>
                      ) : (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                          {filteredExperiences.map((exp, i) => (
                            <ExperienceCard key={`filtered-${exp.id}`} experience={exp} index={i} />
                          ))}
                        </div>
                      )}
                    </section>
                  )}
                </>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="following" className="mt-6">
            {followingLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : formattedFollowingExperiences.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-muted/50 flex items-center justify-center">
                  <UsersThree weight="bold" className="h-10 w-10 text-muted-foreground/40" />
                </div>
                <h3 className="font-heading text-xl font-medium text-foreground mb-2">No posts yet</h3>
                <p className="text-muted-foreground mb-6">
                  Follow families to see their experiences here
                </p>
                <Link href="/explore">
                  <button className="rounded-full bg-primary px-7 py-3 font-semibold text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:-translate-y-0.5">
                    Find Families
                  </button>
                </Link>
              </div>
            ) : (
              <div className="space-y-6 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6 md:space-y-0">
                {formattedFollowingExperiences.map((exp: any, i) => (
                  <div key={exp.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
                    {/* Creator info */}
                    <Link href={`/family/${exp.creator?.id}`}>
                      <div className="flex items-center gap-3 mb-4 cursor-pointer group">
                        {exp.creator?.profileImageUrl || exp.creator?.avatar ? (
                          <img
                            src={exp.creator.profileImageUrl || exp.creator.avatar}
                            alt={exp.creator.name || "User"}
                            className="h-11 w-11 rounded-full object-cover ring-2 ring-border/30 group-hover:ring-primary/30 transition-all"
                          />
                        ) : (
                          <div className="h-11 w-11 rounded-full bg-coral-gradient flex items-center justify-center text-white font-semibold">
                            {(exp.creator?.name || "?").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{exp.creator?.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">shared an experience</p>
                        </div>
                      </div>
                    </Link>
                    <ExperienceCard experience={exp} index={i} />
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
