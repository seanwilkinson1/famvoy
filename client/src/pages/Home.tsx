import { ExperienceCard } from "@/components/shared/ExperienceCard";
import { BoardPickerModal } from "@/components/shared/BoardPickerModal";
import { PodCard } from "@/components/shared/PodCard";
import { TripCard } from "@/components/shared/TripCard";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatExperience } from "@/lib/types";
import { useState, useEffect, useMemo } from "react";
import { MapPin, ChevronRight } from "lucide-react";
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
  const [boardPickerExperienceId, setBoardPickerExperienceId] = useState<number | null>(null);

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

  const { data: userTrips = [] } = useQuery({
    queryKey: ["/api/users/me/trips"],
    queryFn: api.users.getMyTrips,
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

  const { data: memories = [] } = useQuery({
    queryKey: ["feedMemories"],
    queryFn: api.feedMemories.get,
    enabled: !!currentUser,
    staleTime: 60 * 60 * 1000,
  });

  const { data: nearbyExperiences = [] } = useQuery({
    queryKey: ["nearbyExperiences", currentUser?.locationLat, currentUser?.locationLng],
    queryFn: () => api.families.getNearby(currentUser!.locationLat!, currentUser!.locationLng!, 50),
    enabled: !!currentUser?.locationLat && !!currentUser?.locationLng,
    staleTime: 5 * 60 * 1000,
  });

  const formattedExperiences = experiences.map(exp => formatExperience(exp as any));

  const currentTrip = useMemo(() => {
    const today = new Date();
    return (userTrips as any[]).find((t: any) => {
      const start = new Date(t.startDate + "T00:00:00");
      const end = new Date(t.endDate + "T23:59:59");
      return today >= start && today <= end;
    });
  }, [userTrips]);

  const upcomingTrips = useMemo(() => {
    return (userTrips as any[])
      .filter((t: any) => t.status !== "completed")
      .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 6);
  }, [userTrips]);

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
    <div className="min-h-screen bg-background md:pb-8 md:max-w-6xl md:mx-auto md:px-8" style={{ paddingBottom: 'calc(var(--bottom-nav-height, 80px) + 2rem)' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 px-6 pt-4 md:pt-8 pb-4 backdrop-blur-md md:backdrop-blur-none">
        <p className="text-sm font-medium text-muted-foreground">Good morning,</p>
        <h1 className="font-heading text-3xl font-medium text-foreground tracking-tight">
          {currentUser?.name || "Loading..."}
        </h1>
      </div>

      <div className="px-6">
        {/* Filter chips */}
        <div className="overflow-x-auto overflow-y-visible -mx-6 no-scrollbar">
          <div className="flex w-max space-x-2 pb-4 px-6">
            {filters.map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-all active:scale-95",
                    isActive
                      ? "bg-foreground text-background"
                      : "bg-card text-muted-foreground border border-border hover:bg-muted"
                  )}
                  data-testid={`filter-${filter.toLowerCase().replace(/\s/g, '-')}`}
                >
                  {filter === "Nearby" && <MapPin className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />}
                  {filter}
                </button>
              );
            })}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-10 mt-2">
            {activeFilter === "All" ? (
              <>
                {/* 1. Your Current Trip — hero card */}
                {currentTrip && (
                  <section>
                    <Link href={`/trip/${currentTrip.id}/live`}>
                      <div className="relative rounded-2xl overflow-hidden bg-card cursor-pointer transition-all hover:-translate-y-0.5">
                        {currentTrip.coverImage ? (
                          <img
                            src={currentTrip.coverImage}
                            alt={currentTrip.destination}
                            className="w-full h-48 object-cover"
                          />
                        ) : (
                          <div className="w-full h-48 bg-muted" />
                        )}
                        {/* Live badge */}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-xs font-medium z-10">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                          </span>
                          You're traveling!
                        </div>
                        <div className="p-4 space-y-1">
                          <h2 className="font-heading text-xl font-medium text-foreground">{currentTrip.name}</h2>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {currentTrip.destination}
                          </p>
                          <p className="text-xs font-medium text-foreground pt-1">Continue in Trip Mode →</p>
                        </div>
                      </div>
                    </Link>
                  </section>
                )}

                {/* 2. Discover Near You / Discover Experiences */}
                <section>
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-heading text-xl font-medium text-foreground">
                      {currentUser?.locationLat && currentUser?.locationLng ? "Discover Near You" : "Discover Experiences"}
                    </h2>
                    <Link href="/explore">
                      <button className="text-sm font-medium text-muted-foreground flex items-center gap-0.5 hover:text-foreground transition-colors">
                        See all <ChevronRight className="h-4 w-4" />
                      </button>
                    </Link>
                  </div>
                  <div className="overflow-x-auto overflow-y-visible -mx-6 no-scrollbar">
                    <div className="flex w-max space-x-4 pb-4 px-6">
                      {currentUser?.locationLat && currentUser?.locationLng
                        ? nearbyExperiences.slice(0, 6).map((exp: any) => (
                            <ExperienceCard key={exp.id} experience={formatExperience(exp)} horizontal onSaveToBoard={(id) => setBoardPickerExperienceId(id)} />
                          ))
                        : formattedExperiences.slice(0, 6).map((exp) => (
                            <ExperienceCard key={exp.id} experience={exp} horizontal onSaveToBoard={(id) => setBoardPickerExperienceId(id)} />
                          ))
                      }
                    </div>
                  </div>
                </section>

                {/* 3. People Like You */}
                {suggestedFamilies.length > 0 && (
                  <section>
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="font-heading text-xl font-medium text-foreground">People Like You</h2>
                      <Link href="/explore">
                        <button className="text-sm font-medium text-muted-foreground flex items-center gap-0.5 hover:text-foreground transition-colors">
                          See all <ChevronRight className="h-4 w-4" />
                        </button>
                      </Link>
                    </div>
                    <div className="overflow-x-auto overflow-y-visible -mx-6 no-scrollbar">
                      <div className="flex w-max space-x-4 pb-4 px-6">
                        {suggestedFamilies.slice(0, 8).map((family) => (
                          <Link key={family.id} href={`/family/${family.id}`}>
                            <div
                              className="w-36 flex-shrink-0 rounded-2xl bg-card p-4 cursor-pointer text-center transition-all hover:-translate-y-0.5"
                              data-testid={`card-family-${family.id}`}
                            >
                              <Avatar className="h-16 w-16 mx-auto mb-3">
                                <AvatarImage src={family.avatar || undefined} className="object-cover" />
                                <AvatarFallback className="bg-muted text-muted-foreground text-lg font-semibold">
                                  {(family.name || "?")[0]}
                                </AvatarFallback>
                              </Avatar>
                              <p className="font-semibold text-sm text-foreground truncate">{family.name}</p>
                              {family.location && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">{family.location}</p>
                              )}
                              {family.kids && (
                                <p className="text-[11px] text-muted-foreground/70 mt-1 truncate">{family.kids}</p>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                {/* 4. Public Pods */}
                {suggestedPods.length > 0 && (
                  <section>
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="font-heading text-xl font-medium text-foreground">Public Pods</h2>
                      <Link href="/pods">
                        <button className="text-sm font-medium text-muted-foreground flex items-center gap-0.5 hover:text-foreground transition-colors">
                          See all <ChevronRight className="h-4 w-4" />
                        </button>
                      </Link>
                    </div>
                    <div className="overflow-x-auto overflow-y-visible -mx-6 no-scrollbar">
                      <div className="flex w-max space-x-4 pb-4 px-6">
                        {suggestedPods.slice(0, 8).map((pod) => (
                          <PodCard key={pod.id} pod={pod as any} horizontal />
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                {/* 5. Your Trips */}
                {upcomingTrips.length > 0 && (
                  <section>
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="font-heading text-xl font-medium text-foreground">Your Trips</h2>
                      <Link href="/trips">
                        <button className="text-sm font-medium text-muted-foreground flex items-center gap-0.5 hover:text-foreground transition-colors">
                          See all <ChevronRight className="h-4 w-4" />
                        </button>
                      </Link>
                    </div>
                    <div className="overflow-x-auto overflow-y-visible -mx-6 no-scrollbar">
                      <div className="flex w-max space-x-4 pb-4 px-6">
                        {upcomingTrips.map((trip: any) => (
                          <TripCard key={trip.id} trip={trip} horizontal />
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                {/* 6. On This Day Memories */}
                {memories.length > 0 && (
                  <section>
                    <div className="mb-4">
                      <h2 className="font-heading text-xl font-medium text-foreground">On This Day</h2>
                    </div>
                    {memories.map((trip: any) => {
                      const yearsAgo = new Date().getFullYear() - new Date(trip.startDate + "T00:00:00").getFullYear();
                      return (
                        <Link key={trip.id} href={`/trip/${trip.id}/book`}>
                          <div className="rounded-2xl bg-card border border-border p-5 cursor-pointer hover:bg-muted/50 transition-all">
                            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">
                              {yearsAgo} year{yearsAgo !== 1 ? "s" : ""} ago today
                            </p>
                            <h3 className="font-semibold text-[15px] text-foreground">
                              {trip.name}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {trip.destination}
                            </p>
                            <p className="text-xs font-medium text-foreground mt-2">
                              Relive this trip →
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </section>
                )}
              </>
            ) : (
              /* Filtered Results */
              <section>
                <h2 className="mb-4 font-heading text-xl font-medium text-foreground">
                  {`${activeFilter} Experiences`}
                </h2>
                {activeFilter === "Nearby" && locationError && (
                  <div className="mb-4 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 flex items-center gap-2">
                    <MapPin className="h-5 w-5 flex-shrink-0" />
                    Location access denied. Enable location to see nearby experiences.
                  </div>
                )}
                {activeFilter === "Nearby" && !userLocation && !locationError && (
                  <div className="mb-4 rounded-2xl bg-muted border border-border p-4 text-sm text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-5 w-5 flex-shrink-0" />
                    Getting your location...
                  </div>
                )}
                {filteredExperiences.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No experiences match this filter
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredExperiences.map((exp) => (
                      <ExperienceCard key={`filtered-${exp.id}`} experience={exp} onSaveToBoard={(id) => setBoardPickerExperienceId(id)} />
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </div>

      {boardPickerExperienceId !== null && currentUser && (
        <BoardPickerModal
          experienceId={boardPickerExperienceId}
          onClose={() => setBoardPickerExperienceId(null)}
          userId={currentUser.id}
        />
      )}
    </div>
  );
}
