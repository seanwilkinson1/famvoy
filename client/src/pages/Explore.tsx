import { ExperienceCard } from "@/components/shared/ExperienceCard";
import { FamilySwipeCard, SwipeButtons } from "@/components/shared/FamilySwipeCard";
import { MatchModal } from "@/components/shared/MatchModal";
import { ExploreMap } from "@/components/shared/ExploreMap";
import { Search, Navigation, Map, Users, Compass, X, ChevronDown, MessageCircle, MapPin, Filter, SlidersHorizontal, Locate, Clock, DollarSign, Star, CheckCircle2, ArrowRight } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { formatExperience } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { User, Experience } from "@shared/schema";

type ExploreTab = "map" | "discover" | "connections";

const CATEGORIES = ["All", "Outdoor", "Indoor", "Food", "Sports", "Arts", "Education", "Entertainment"];
const AGE_RANGES = ["All Ages", "0-2", "3-5", "5-8", "8-12", "12+"];
const COST_OPTIONS = ["Any Cost", "Free", "$", "$$", "$$$"];

function useUserLocation() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (err) => {
        setError(err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  return { location, error };
}

export default function Explore() {
  const [activeTab, setActiveTab] = useState<ExploreTab>("map");
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [currentFamilyIndex, setCurrentFamilyIndex] = useState(0);
  const [showMatch, setShowMatch] = useState(false);
  const [matchedFamily, setMatchedFamily] = useState<User | null>(null);
  const [matchedPodId, setMatchedPodId] = useState<number | undefined>(undefined);
  
  const [familySearchQuery, setFamilySearchQuery] = useState("");
  
  const [showFilters, setShowFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [ageFilter, setAgeFilter] = useState("All Ages");
  const [costFilter, setCostFilter] = useState("Any Cost");
  const [maxDistance, setMaxDistance] = useState(50);
  
  const { location: userLocation } = useUserLocation();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const messageMutation = useMutation({
    mutationFn: async (otherUserId: number) => {
      return api.pods.createDirect(otherUserId);
    },
    onSuccess: (pod) => {
      setLocation(`/pod/${pod.id}`);
    },
  });

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: api.users.getMe,
  });

  const { data: experiences = [], isLoading: loadingExperiences } = useQuery({
    queryKey: ["experiences"],
    queryFn: api.experiences.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ["experienceSearch", searchQuery],
    queryFn: () => api.experiences.search(searchQuery),
    enabled: searchQuery.length > 1,
  });

  const { data: discoverFamilies = [], isLoading: loadingFamilies } = useQuery({
    queryKey: ["discoverFamilies", userLocation?.lat, userLocation?.lng],
    queryFn: () => api.families.discover(userLocation?.lat, userLocation?.lng),
    enabled: activeTab === "discover" && familySearchQuery.length < 2,
  });

  const { data: familySearchResults = [], isLoading: searchingFamilies } = useQuery({
    queryKey: ["familySearch", familySearchQuery],
    queryFn: () => api.families.search(familySearchQuery),
    enabled: familySearchQuery.length >= 2,
  });

  const { data: nearbyExperiences = [] } = useQuery({
    queryKey: ["nearbyExperiences", userLocation?.lat, userLocation?.lng],
    queryFn: () => userLocation ? api.families.getNearby(userLocation.lat, userLocation.lng, 100) : [],
    enabled: !!userLocation,
  });

  const { data: connections = [] } = useQuery({
    queryKey: ["connections", currentUser?.id],
    queryFn: () => currentUser ? api.users.getMatches(currentUser.id) : [],
    enabled: !!currentUser,
  });

  const swipeMutation = useMutation({
    mutationFn: async ({ swipedUserId, liked }: { swipedUserId: number; liked: boolean }) => {
      return api.families.swipe(swipedUserId, liked);
    },
    onSuccess: (result, variables) => {
      if (result.matched) {
        const family = discoverFamilies[currentFamilyIndex];
        setMatchedFamily(family);
        setMatchedPodId(result.podId);
        setShowMatch(true);
        queryClient.invalidateQueries({ queryKey: ["connections"] });
        queryClient.invalidateQueries({ queryKey: ["userPods"] });
      }
      setCurrentFamilyIndex((prev) => prev + 1);
      queryClient.invalidateQueries({ queryKey: ["discoverFamilies"] });
    },
  });

  const handleSwipe = (liked: boolean) => {
    const family = discoverFamilies[currentFamilyIndex];
    if (family) {
      swipeMutation.mutate({ swipedUserId: family.id, liked });
    }
  };

  const displayExperiences = searchQuery.length > 1 
    ? searchResults 
    : (nearbyExperiences.length > 0 ? nearbyExperiences : experiences);

  const filteredExperiences = useMemo(() => {
    return displayExperiences.filter((exp) => {
      if (categoryFilter !== "All" && exp.category !== categoryFilter) {
        return false;
      }
      
      if (ageFilter !== "All Ages" && exp.ages) {
        const expAgeRanges = exp.ages.toLowerCase();
        const filterAge = ageFilter.toLowerCase();
        if (!expAgeRanges.includes("all") && !expAgeRanges.includes(filterAge.replace("-", " to "))) {
          if (ageFilter === "0-2" && !expAgeRanges.includes("0") && !expAgeRanges.includes("toddler") && !expAgeRanges.includes("baby")) {
            return false;
          }
        }
      }
      
      if (costFilter !== "Any Cost") {
        if (costFilter === "Free" && exp.cost?.toLowerCase() !== "free") {
          return false;
        } else if (costFilter !== "Free" && exp.cost !== costFilter) {
          return false;
        }
      }
      
      if ('distance' in exp && typeof (exp as any).distance === 'number') {
        const distanceKm = (exp as any).distance / 1000;
        if (distanceKm > maxDistance) {
          return false;
        }
      }
      
      return true;
    });
  }, [displayExperiences, categoryFilter, ageFilter, costFilter, maxDistance]);

  const formattedExperiences = filteredExperiences.map(exp => ({
    ...formatExperience(exp as any),
    distance: 'distance' in exp ? (exp as any).distance : undefined,
  }));
  
  const activeFiltersCount = [
    categoryFilter !== "All",
    ageFilter !== "All Ages",
    costFilter !== "Any Cost",
    maxDistance < 50
  ].filter(Boolean).length;

  const currentFamily = discoverFamilies[currentFamilyIndex];
  const nextFamily = discoverFamilies[currentFamilyIndex + 1];

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gray-100">
      {/* Tab Selector */}
      <div className="absolute top-14 left-0 right-0 z-40 px-4">
        <div className="flex rounded-2xl bg-white/90 backdrop-blur-md p-1.5 shadow-lg">
          {[
            { id: "map" as const, icon: Map, label: "Explore" },
            { id: "discover" as const, icon: Users, label: "Discover" },
            { id: "connections" as const, icon: Compass, label: "Friends" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all",
                activeTab === tab.id
                  ? "bg-primary text-white shadow-md"
                  : "text-gray-500 hover:text-gray-700"
              )}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Map View */}
      <AnimatePresence mode="wait">
        {activeTab === "map" && (
          <motion.div
            key="map"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
          >
            {/* Interactive Map */}
            <div className="absolute inset-0 h-full w-full">
              <ExploreMap
                experiences={filteredExperiences}
                userLocation={userLocation}
              />
            </div>

            {/* Search Overlay */}
            <AnimatePresence>
              {showSearch && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="absolute top-32 left-4 right-4 z-50"
                >
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search experiences, places..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-2xl bg-white py-4 pl-12 pr-12 text-base shadow-lg outline-none placeholder:text-gray-400"
                      autoFocus
                      data-testid="input-search"
                    />
                    <button
                      onClick={() => { setShowSearch(false); setSearchQuery(""); }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-gray-100 p-1"
                    >
                      <X className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Map Overlays */}
            <div className="absolute right-4 top-32 flex flex-col gap-3">
              <button 
                onClick={() => setShowSearch(!showSearch)}
                className={cn(
                  "rounded-full p-3 shadow-lg shadow-black/5 active:scale-90 transition-transform",
                  showSearch ? "bg-primary text-white" : "bg-white text-gray-700"
                )}
                data-testid="button-search"
              >
                <Search className="h-6 w-6" />
              </button>
              <button className="rounded-full bg-white p-3 shadow-lg shadow-black/5 active:scale-90 transition-transform" data-testid="button-locate">
                <Navigation className="h-6 w-6 text-primary fill-primary" />
              </button>
            </div>

            {/* Bottom Sheet */}
            <motion.div
              drag="y"
              dragConstraints={{ top: -500, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.y < -100) setIsExpanded(true);
                if (info.offset.y > 100) setIsExpanded(false);
              }}
              animate={{ height: isExpanded ? "50%" : "140px" }}
              className="absolute bottom-0 left-0 right-0 z-30 rounded-t-[32px] bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.12)] overflow-hidden"
            >
              <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="h-1.5 w-12 rounded-full bg-gray-200" />
              </div>

              <div className="px-6 pt-2 h-[calc(100%-32px)] overflow-hidden flex flex-col">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-heading text-lg font-bold text-gray-900">
                    {searchQuery ? `Results for "${searchQuery}"` : `${filteredExperiences.length} experiences nearby`}
                  </h3>
                  <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className={cn(
                      "flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide transition-colors",
                      showFilters || activeFiltersCount > 0 ? "text-primary" : "text-gray-500"
                    )}
                    data-testid="button-filter"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    Filter
                    {activeFiltersCount > 0 && (
                      <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                        {activeFiltersCount}
                      </span>
                    )}
                  </button>
                </div>

                {/* Filter Panel */}
                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mb-4"
                    >
                      <div className="space-y-4 pb-4 border-b border-gray-100">
                        {/* Category Filter */}
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Category</label>
                          <div className="flex flex-wrap gap-2">
                            {CATEGORIES.map((cat) => (
                              <button
                                key={cat}
                                onClick={() => setCategoryFilter(cat)}
                                className={cn(
                                  "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                                  categoryFilter === cat
                                    ? "bg-primary text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                )}
                                data-testid={`filter-category-${cat.toLowerCase()}`}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Age Range Filter */}
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Age Range</label>
                          <div className="flex flex-wrap gap-2">
                            {AGE_RANGES.map((age) => (
                              <button
                                key={age}
                                onClick={() => setAgeFilter(age)}
                                className={cn(
                                  "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                                  ageFilter === age
                                    ? "bg-primary text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                )}
                                data-testid={`filter-age-${age.toLowerCase().replace(/\s+/g, "-")}`}
                              >
                                {age}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Cost Filter */}
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Cost</label>
                          <div className="flex flex-wrap gap-2">
                            {COST_OPTIONS.map((cost) => (
                              <button
                                key={cost}
                                onClick={() => setCostFilter(cost)}
                                className={cn(
                                  "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                                  costFilter === cost
                                    ? "bg-primary text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                )}
                                data-testid={`filter-cost-${cost.toLowerCase().replace(/\s+/g, "-")}`}
                              >
                                {cost}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Distance Slider */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Max Distance</label>
                            <span className="text-xs font-bold text-primary">{maxDistance} km</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="100"
                            value={maxDistance}
                            onChange={(e) => setMaxDistance(parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-primary"
                            data-testid="filter-distance-slider"
                          />
                          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                            <span>1 km</span>
                            <span>100 km</span>
                          </div>
                        </div>

                        {/* Clear Filters */}
                        {activeFiltersCount > 0 && (
                          <button
                            onClick={() => {
                              setCategoryFilter("All");
                              setAgeFilter("All Ages");
                              setCostFilter("Any Cost");
                              setMaxDistance(50);
                            }}
                            className="text-xs font-medium text-gray-500 underline hover:text-gray-700"
                            data-testid="button-clear-filters"
                          >
                            Clear all filters
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className={cn(
                  "flex-1 space-y-4 no-scrollbar",
                  isExpanded ? "overflow-y-auto pb-32" : "overflow-hidden"
                )}>
                  {loadingExperiences ? (
                    <div className="text-center py-4 text-gray-400">Loading...</div>
                  ) : formattedExperiences.length === 0 ? (
                    <div className="text-center py-4">
                      <div className="text-gray-400 mb-2">No experiences match your filters</div>
                      <button
                        onClick={() => {
                          setCategoryFilter("All");
                          setAgeFilter("All Ages");
                          setCostFilter("Any Cost");
                          setMaxDistance(50);
                        }}
                        className="text-sm text-primary font-medium"
                        data-testid="button-reset-filters"
                      >
                        Reset filters
                      </button>
                    </div>
                  ) : !isExpanded ? (
                    <div 
                      className="flex gap-3 overflow-x-auto no-scrollbar cursor-pointer"
                      onClick={() => setIsExpanded(true)}
                    >
                      {formattedExperiences.slice(0, 5).map((exp) => (
                        <div 
                          key={exp.id} 
                          className="flex-shrink-0 w-24"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocation(`/experience/${exp.id}`);
                          }}
                        >
                          <img 
                            src={exp.image} 
                            alt={exp.title}
                            className="w-24 h-16 object-cover rounded-xl"
                          />
                          <p className="text-xs font-medium text-gray-700 mt-1 truncate">{exp.title}</p>
                        </div>
                      ))}
                      {formattedExperiences.length > 5 && (
                        <div className="flex-shrink-0 w-24 h-16 bg-gray-100 rounded-xl flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-500">+{formattedExperiences.length - 5} more</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    formattedExperiences.map((exp) => (
                      <ExperienceCard key={exp.id} experience={exp} className="shadow-none border border-gray-100" />
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Discover View (Swipe) */}
        {activeTab === "discover" && (
          <motion.div
            key="discover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pt-28 pb-24 px-4 flex flex-col"
          >
            {/* Family Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search families by name or email..."
                  value={familySearchQuery}
                  onChange={(e) => setFamilySearchQuery(e.target.value)}
                  className="w-full rounded-2xl bg-white py-3 pl-12 pr-10 text-sm shadow-sm outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-primary/20"
                  data-testid="input-family-search"
                />
                {familySearchQuery && (
                  <button
                    onClick={() => setFamilySearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-gray-100 p-1"
                    data-testid="button-clear-family-search"
                  >
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                )}
              </div>
            </div>

            {/* Search Results or Swipe Cards */}
            {familySearchQuery.length >= 2 ? (
              <div className="flex-1 overflow-y-auto no-scrollbar">
                {searchingFamilies ? (
                  <div className="flex items-center justify-center h-40 text-gray-400">
                    Searching...
                  </div>
                ) : familySearchResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                      <Search className="h-8 w-8 text-gray-300" />
                    </div>
                    <h3 className="font-heading text-lg font-bold text-gray-900 mb-2">No families found</h3>
                    <p className="text-sm text-gray-500">Try searching with a different name or email</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                      {familySearchResults.length} {familySearchResults.length === 1 ? 'family' : 'families'} found
                    </p>
                    {familySearchResults.filter(f => f.id !== currentUser?.id).map((family) => (
                      <div
                        key={family.id}
                        className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm"
                        data-testid={`card-search-result-${family.id}`}
                      >
                        <div 
                          className="flex items-center gap-4 flex-1 cursor-pointer"
                          onClick={() => setLocation(`/family/${family.id}`)}
                        >
                          {(family.profileImageUrl || family.avatar) ? (
                            <img
                              src={family.profileImageUrl || family.avatar || ''}
                              alt={family.name || 'Family'}
                              className="h-14 w-14 rounded-full object-cover ring-2 ring-primary/10"
                            />
                          ) : (
                            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center ring-2 ring-primary/10">
                              <span className="text-white text-xl font-bold">
                                {(family.name || 'F').charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-heading font-bold text-gray-900 truncate">{family.name || 'Family'}</h3>
                            <p className="text-sm text-gray-500 truncate">{family.location || 'Location not set'}</p>
                            {family.email && (
                              <p className="text-xs text-gray-400 truncate">{family.email}</p>
                            )}
                          </div>
                        </div>
                        <button 
                          onClick={() => messageMutation.mutate(family.id)}
                          disabled={messageMutation.isPending}
                          className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-2 text-sm font-bold text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                          data-testid={`button-message-search-${family.id}`}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="relative flex-1 w-full max-w-sm mx-auto">
                {loadingFamilies ? (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    Loading families...
                  </div>
                ) : currentFamilyIndex >= discoverFamilies.length ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                      <Users className="h-10 w-10 text-gray-300" />
                    </div>
                    <h3 className="font-heading text-xl font-bold text-gray-900 mb-2">No more families</h3>
                    <p className="text-sm text-gray-500">Check back later for new families nearby!</p>
                  </div>
                ) : (
                  <>
                    {/* Card Stack */}
                    <div className="relative h-[70%]">
                      {nextFamily && (
                        <div className="absolute inset-0 scale-95 opacity-50">
                          <FamilySwipeCard family={nextFamily} onSwipe={() => {}} isTop={false} />
                        </div>
                      )}
                      {currentFamily && (
                        <FamilySwipeCard
                          key={currentFamily.id}
                          family={currentFamily}
                          onSwipe={handleSwipe}
                          isTop={true}
                        />
                      )}
                    </div>

                    {/* Swipe Buttons */}
                    <SwipeButtons onSwipe={handleSwipe} disabled={swipeMutation.isPending} />
                  </>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Connections View */}
        {activeTab === "connections" && (
          <motion.div
            key="connections"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pt-28 pb-24 px-6 overflow-y-auto no-scrollbar"
          >
            <h2 className="font-heading text-2xl font-bold text-gray-900 mb-2">Your Family Friends</h2>
            <p className="text-sm text-gray-500 mb-6">Families you've connected with</p>

            {connections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Users className="h-10 w-10 text-gray-300" />
                </div>
                <h3 className="font-heading text-lg font-bold text-gray-900 mb-2">No connections yet</h3>
                <p className="text-sm text-gray-500 mb-4">Start swiping to find families near you!</p>
                <button
                  onClick={() => setActiveTab("discover")}
                  className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-white"
                >
                  Discover Families
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {connections.map((family) => (
                  <div
                    key={family.id}
                    className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm"
                    data-testid={`card-connection-${family.id}`}
                  >
                    <div 
                      className="flex items-center gap-4 flex-1 cursor-pointer"
                      onClick={() => setLocation(`/family/${family.id}`)}
                    >
                      {(family.profileImageUrl || family.avatar) ? (
                        <img
                          src={family.profileImageUrl || family.avatar || ''}
                          alt={family.name || 'Family'}
                          className="h-16 w-16 rounded-full object-cover ring-2 ring-primary/20"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center ring-2 ring-primary/20">
                          <span className="text-white text-2xl font-bold">
                            {(family.name || 'F').charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-heading font-bold text-gray-900">{family.name || 'Family'}</h3>
                        <p className="text-sm text-gray-500">{family.location || 'Location not set'}</p>
                        <div className="mt-1 flex gap-1">
                          {(family.interests || []).slice(0, 2).map((i) => (
                            <span key={i} className="text-xs text-primary font-medium">{i}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => messageMutation.mutate(family.id)}
                      disabled={messageMutation.isPending}
                      className="flex items-center gap-1 rounded-full bg-primary/10 px-4 py-2 text-sm font-bold text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                      data-testid={`button-message-${family.id}`}
                    >
                      <MessageCircle className="h-4 w-4" />
                      Message
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Match Modal */}
      <MatchModal
        isOpen={showMatch}
        onClose={() => setShowMatch(false)}
        matchedFamily={matchedFamily}
        currentUser={currentUser || null}
        podId={matchedPodId}
      />
    </div>
  );
}
