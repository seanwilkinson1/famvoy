import { ExperienceCard } from "@/components/shared/ExperienceCard";
import { FamilySwipeCard, SwipeButtons } from "@/components/shared/FamilySwipeCard";
import { MatchModal } from "@/components/shared/MatchModal";
import { ExploreMap, MapBounds } from "@/components/shared/ExploreMap";
import { useGoogleMapsContext } from "@/components/shared/GoogleMapsProvider";
import { Search, Navigation, Map, Users, Compass, X, ChevronDown, MessageCircle, MapPin, Filter, SlidersHorizontal, Locate, Clock, DollarSign, Star, CheckCircle2, ArrowRight, Loader2, Plane, MapPinned, Eye, EyeOff, Check } from "lucide-react";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { api } from "@/lib/api";
import { formatExperience } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FAMILY_VALUES } from "@/lib/constants";
import type { User, Experience, Pod } from "@shared/schema";
import { format } from "date-fns";

type ExploreTab = "map" | "discover" | "connections";
type FilterModalType = "categories" | "pods" | "interests" | null;

const CATEGORIES = ["All", "Outdoor", "Indoor", "Food", "Sports", "Arts", "Education", "Entertainment"];
const INTERESTS = ["Adventure", "Education", "Creativity", "Nature & Outdoors", "Arts & Culture", "Health & Wellness", "Community", "Quality Time"];
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

interface FilterBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  children: React.ReactNode;
  onClear: () => void;
  onApply: () => void;
}

function FilterBottomSheet({ isOpen, onClose, title, description, children, onClear, onApply }: FilterBottomSheetProps) {
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[100]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[110] bg-gray-900 rounded-t-3xl max-h-[85vh] overflow-hidden"
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-600 rounded-full" />
            </div>
            <div className="px-4 pb-8">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-white">{title}</h3>
                <button
                  onClick={onClear}
                  className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
                  data-testid={`filter-modal-clear-${title.toLowerCase()}`}
                >
                  Clear
                </button>
              </div>
              <p className="text-sm text-gray-400 mb-4">{description}</p>
              
              <div className="overflow-y-auto max-h-[50vh]">
                {children}
              </div>
              
              <button
                onClick={onApply}
                className="w-full mt-4 py-3 px-6 bg-coral text-white font-semibold rounded-full hover:bg-coral/90 transition-colors"
                data-testid={`filter-modal-apply-${title.toLowerCase()}`}
              >
                Show
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default function Explore() {
  const [activeTab, setActiveTab] = useState<ExploreTab>("map");
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentFamilyIndex, setCurrentFamilyIndex] = useState(0);
  const [showMatch, setShowMatch] = useState(false);
  const [matchedFamily, setMatchedFamily] = useState<User | null>(null);
  const [matchedPodId, setMatchedPodId] = useState<number | undefined>(undefined);
  
  const [familySearchQuery, setFamilySearchQuery] = useState("");
  
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [maxDistance, setMaxDistance] = useState(50);

  const [searchLocation, setSearchLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [placePredictions, setPlacePredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  
  const [selectedPodFilter, setSelectedPodFilter] = useState<number | "all">("all");
  const [showPeopleOnMap, setShowPeopleOnMap] = useState(true);
  const [showTripsDrawer, setShowTripsDrawer] = useState(false);
  const [followingFilter, setFollowingFilter] = useState(false);
  
  const [activeFilterModal, setActiveFilterModal] = useState<FilterModalType>(null);
  const [podSearchQuery, setPodSearchQuery] = useState("");
  const [visibleBounds, setVisibleBounds] = useState<MapBounds | null>(null);
  
  const { location: userLocation } = useUserLocation();
  const { isLoaded: mapsLoaded } = useGoogleMapsContext();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (mapsLoaded && !autocompleteServiceRef.current && typeof google !== 'undefined' && google.maps?.places) {
      autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
      const mapDiv = document.createElement("div");
      placesServiceRef.current = new google.maps.places.PlacesService(mapDiv);
    }
  }, [mapsLoaded]);

  useEffect(() => {
    if (!autocompleteServiceRef.current || searchQuery.length < 2) {
      setPlacePredictions([]);
      return;
    }

    setIsSearchingPlaces(true);
    const timer = setTimeout(() => {
      autocompleteServiceRef.current?.getPlacePredictions(
        { input: searchQuery, types: ["(regions)"] },
        (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            setPlacePredictions(results.slice(0, 3));
          } else {
            setPlacePredictions([]);
          }
          setIsSearchingPlaces(false);
        }
      );
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handlePlaceSelect = (prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesServiceRef.current) return;

    placesServiceRef.current.getDetails(
      { placeId: prediction.place_id, fields: ["geometry"] },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          setSearchLocation({
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          });
          setSearchQuery(prediction.description);
          setPlacePredictions([]);
        }
      }
    );
  };

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
    staleTime: 5 * 60 * 1000,
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

  const { data: userPods = [] } = useQuery({
    queryKey: ["userPods"],
    queryFn: () => api.pods.getAll(),
  });

  const { data: explorePeople = [] } = useQuery({
    queryKey: ["explorePeople", selectedPodFilter],
    queryFn: () => api.explore.getPeople(typeof selectedPodFilter === "number" ? selectedPodFilter : undefined),
  });

  const filteredExplorePeople = useMemo(() => {
    let people = explorePeople;
    if (selectedPodFilter !== "all") {
      people = people.filter(p => p.podIds.includes(selectedPodFilter as number));
    }
    if (followingFilter) {
      const followingIds = new Set(connections.map((c: User) => c.id));
      people = people.filter(p => followingIds.has(p.id));
    }
    // Filter by selected interests - people's interests must include at least one selected interest
    if (selectedInterests.length > 0) {
      people = people.filter(p => {
        const personInterests = p.interests || [];
        return selectedInterests.some(interest => 
          personInterests.some((pi: string) => pi.toLowerCase().includes(interest.toLowerCase()))
        );
      });
    }
    return people;
  }, [explorePeople, selectedPodFilter, followingFilter, connections, selectedInterests]);

  const { data: exploreTrips = [] } = useQuery({
    queryKey: ["exploreTrips"],
    queryFn: () => api.explore.getTrips(),
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
      
      if ('distance' in exp && typeof (exp as any).distance === 'number') {
        const distanceKm = (exp as any).distance / 1000;
        if (distanceKm > maxDistance) {
          return false;
        }
      }
      
      // Filter by selected interests - experience tags must include at least one selected interest
      if (selectedInterests.length > 0) {
        const expTags = (exp as any).tags || [];
        const hasMatchingInterest = selectedInterests.some(interest => 
          expTags.some((tag: string) => tag.toLowerCase().includes(interest.toLowerCase()))
        );
        if (!hasMatchingInterest) {
          return false;
        }
      }
      
      return true;
    });
  }, [displayExperiences, categoryFilter, maxDistance, selectedInterests]);

  const isInBounds = useCallback((lat: number, lng: number, bounds: MapBounds | null) => {
    if (!bounds) return true;
    return lat >= bounds.south && lat <= bounds.north && 
           lng >= bounds.west && lng <= bounds.east;
  }, []);

  const experiencesInView = useMemo(() => {
    if (!visibleBounds) return filteredExperiences;
    return filteredExperiences.filter(exp => 
      isInBounds(exp.locationLat, exp.locationLng, visibleBounds)
    );
  }, [filteredExperiences, visibleBounds, isInBounds]);

  const formattedExperiences = experiencesInView.map(exp => ({
    ...formatExperience(exp as any),
    distance: 'distance' in exp ? (exp as any).distance : undefined,
  }));
  
  const activeFiltersCount = [
    categoryFilter !== "All",
    selectedPodFilter !== "all",
    selectedInterests.length > 0,
    followingFilter,
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setCategoryFilter("All");
    setSelectedPodFilter("all");
    setSelectedInterests([]);
    setFollowingFilter(false);
  };

  const filteredPods = useMemo(() => {
    const nonDirectPods = userPods.filter((p: Pod) => !p.isDirect);
    if (!podSearchQuery) return nonDirectPods;
    return nonDirectPods.filter((p: Pod) => 
      p.name.toLowerCase().includes(podSearchQuery.toLowerCase())
    );
  }, [userPods, podSearchQuery]);

  const currentFamily = discoverFamilies[currentFamilyIndex];
  const nextFamily = discoverFamilies[currentFamilyIndex + 1];

  return (
    <div className="fixed inset-0 top-0 bottom-0 w-full overflow-hidden bg-gray-100 z-30">
      {/* Map View */}
      <div className="relative h-full">
        {/* Interactive Map */}
        <div className="absolute inset-0 h-full w-full">
          <ExploreMap
            experiences={filteredExperiences}
            userLocation={userLocation}
            searchLocation={searchLocation}
            people={showPeopleOnMap ? filteredExplorePeople : []}
            onBoundsChange={setVisibleBounds}
          />
        </div>

        {/* Fixed Search Bar - Always visible at top */}
        <div className="absolute top-4 left-0 right-0 z-40 px-4 pt-safe">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search experiences and families"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (searchLocation) setSearchLocation(null);
              }}
              className="w-full rounded-full bg-gray-900 py-4 pl-12 pr-12 text-white text-base shadow-xl outline-none placeholder:text-gray-400"
              data-testid="input-search-main"
            />
            {isSearchingPlaces ? (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
              </div>
            ) : searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setSearchLocation(null); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-gray-700 p-1"
                data-testid="button-clear-search"
              >
                <X className="h-3 w-3 text-gray-300" />
              </button>
            )}
          </div>

          {/* Place Predictions */}
          {placePredictions.length > 0 && (
            <div className="mt-2 rounded-xl bg-gray-800/95 shadow-lg overflow-hidden backdrop-blur-sm">
              {placePredictions.map((prediction) => (
                <button
                  key={prediction.place_id}
                  onClick={() => handlePlaceSelect(prediction)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-700/50 flex items-start gap-3 border-b border-gray-700 last:border-0"
                  data-testid={`place-prediction-${prediction.place_id}`}
                >
                  <MapPin className="h-5 w-5 text-coral mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {prediction.structured_formatting.main_text}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {prediction.structured_formatting.secondary_text}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filter Chips Row - Below search bar */}
        <div className="absolute top-20 left-0 right-0 z-30 px-4 pt-safe">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2">
            {/* Clear Filter with Badge */}
            {activeFiltersCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full bg-gray-900 text-white text-sm font-medium shadow-xl"
                data-testid="filter-clear-all"
              >
                <X className="h-4 w-4" />
                Clear
                <span className="bg-coral text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {activeFiltersCount}
                </span>
              </button>
            )}

            {/* Categories Dropdown Chip */}
            <button
              onClick={() => setActiveFilterModal("categories")}
              className={cn(
                "flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium shadow-xl transition-all",
                categoryFilter !== "All"
                  ? "bg-coral text-white"
                  : "bg-gray-900 text-white"
              )}
              data-testid="filter-chip-categories"
            >
              {categoryFilter !== "All" ? categoryFilter : "Categories"}
              <ChevronDown className="h-4 w-4" />
            </button>

            {/* Pods Dropdown Chip */}
            <button
              onClick={() => setActiveFilterModal("pods")}
              className={cn(
                "flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium shadow-xl transition-all",
                selectedPodFilter !== "all"
                  ? "bg-coral text-white"
                  : "bg-gray-900 text-white"
              )}
              data-testid="filter-chip-pods"
            >
              {selectedPodFilter !== "all" 
                ? userPods.find((p: Pod) => p.id === selectedPodFilter)?.name || "Pod"
                : "Pods"}
              <ChevronDown className="h-4 w-4" />
            </button>

            {/* Interests Dropdown Chip */}
            <button
              onClick={() => setActiveFilterModal("interests")}
              className={cn(
                "flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium shadow-xl transition-all",
                selectedInterests.length > 0
                  ? "bg-coral text-white"
                  : "bg-gray-900 text-white"
              )}
              data-testid="filter-chip-interests"
            >
              Interests
              {selectedInterests.length > 0 && (
                <span className="bg-white/20 text-xs px-1.5 rounded-full">{selectedInterests.length}</span>
              )}
              <ChevronDown className="h-4 w-4" />
            </button>

            {/* People You Follow Toggle Chip */}
            <button
              onClick={() => setFollowingFilter(!followingFilter)}
              className={cn(
                "flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium shadow-xl transition-all",
                followingFilter
                  ? "bg-warm-teal text-white"
                  : "bg-gray-900 text-white"
              )}
              data-testid="filter-chip-following"
            >
              <Users className="h-4 w-4" />
              People you follow
            </button>

            {/* Toggle People on Map */}
            <button
              onClick={() => setShowPeopleOnMap(!showPeopleOnMap)}
              className={cn(
                "flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium shadow-xl transition-all",
                showPeopleOnMap
                  ? "bg-blue-500 text-white"
                  : "bg-gray-900 text-gray-400"
              )}
              data-testid="toggle-people-map"
            >
              {showPeopleOnMap ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              People
            </button>
          </div>
        </div>

        {/* Map Overlays */}
        <div className="absolute right-4 top-36 flex flex-col gap-3 z-20">
          <button className="rounded-full bg-white p-3 shadow-lg shadow-black/5 active:scale-90 transition-transform" data-testid="button-locate">
            <Navigation className="h-6 w-6 text-primary fill-primary" />
          </button>
        </div>

        {/* Bottom Sheet */}
        <motion.div
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          dragSnapToOrigin
          onDragEnd={(_, info) => {
            if (info.offset.y < -50) setIsExpanded(true);
            if (info.offset.y > 50) setIsExpanded(false);
          }}
          animate={{ y: 0, height: isExpanded ? "70%" : "140px" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="absolute bottom-0 left-0 right-0 z-30 rounded-t-[32px] bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.12)] overflow-hidden"
        >
          <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing" onClick={() => setIsExpanded(!isExpanded)}>
            <div className="h-1.5 w-12 rounded-full bg-gray-200" />
          </div>

          <div className="px-6 pt-2 h-[calc(100%-32px)] overflow-hidden flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-heading text-lg font-bold text-gray-900">
                {searchQuery ? `Results for "${searchQuery}"` : `${formattedExperiences.length} experiences in view`}
              </h3>
            </div>

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
                    onClick={clearAllFilters}
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
      </div>

      {/* Categories Filter Modal */}
      <FilterBottomSheet
        isOpen={activeFilterModal === "categories"}
        onClose={() => setActiveFilterModal(null)}
        title="Categories"
        description="Filter experiences by category type"
        onClear={() => setCategoryFilter("All")}
        onApply={() => setActiveFilterModal(null)}
      >
        <div className="space-y-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors",
                categoryFilter === cat
                  ? "bg-coral/20 text-coral"
                  : "bg-gray-800 text-white hover:bg-gray-700"
              )}
              data-testid={`filter-modal-category-${cat.toLowerCase()}`}
            >
              <span className="font-medium">{cat}</span>
              {categoryFilter === cat && (
                <div className="w-5 h-5 rounded-full bg-coral flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </FilterBottomSheet>

      {/* Pods Filter Modal */}
      <FilterBottomSheet
        isOpen={activeFilterModal === "pods"}
        onClose={() => setActiveFilterModal(null)}
        title="Pods"
        description="Filter to see people from specific pods"
        onClear={() => {
          setSelectedPodFilter("all");
          setPodSearchQuery("");
        }}
        onApply={() => setActiveFilterModal(null)}
      >
        <div className="space-y-3">
          {/* Search field for pods */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search pods..."
              value={podSearchQuery}
              onChange={(e) => setPodSearchQuery(e.target.value)}
              className="w-full rounded-xl bg-gray-800 py-3 pl-10 pr-4 text-white text-sm outline-none placeholder:text-gray-500 border border-gray-700 focus:border-gray-600"
              data-testid="input-pod-search"
            />
          </div>

          {/* All option */}
          <button
            onClick={() => setSelectedPodFilter("all")}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors",
              selectedPodFilter === "all"
                ? "bg-coral/20 text-coral"
                : "bg-gray-800 text-white hover:bg-gray-700"
            )}
            data-testid="filter-modal-pod-all"
          >
            <span className="font-medium">All Pods</span>
            {selectedPodFilter === "all" && (
              <div className="w-5 h-5 rounded-full bg-coral flex items-center justify-center">
                <Check className="h-3 w-3 text-white" />
              </div>
            )}
          </button>

          {/* Pod list */}
          {filteredPods.map((pod: Pod) => (
            <button
              key={pod.id}
              onClick={() => setSelectedPodFilter(pod.id)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors",
                selectedPodFilter === pod.id
                  ? "bg-coral/20 text-coral"
                  : "bg-gray-800 text-white hover:bg-gray-700"
              )}
              data-testid={`filter-modal-pod-${pod.id}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-coral to-amber-400 flex items-center justify-center">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <span className="font-medium truncate">{pod.name}</span>
              </div>
              {selectedPodFilter === pod.id && (
                <div className="w-5 h-5 rounded-full bg-coral flex items-center justify-center flex-shrink-0">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
            </button>
          ))}

          {filteredPods.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              {podSearchQuery ? "No pods match your search" : "You haven't joined any pods yet"}
            </div>
          )}
        </div>
      </FilterBottomSheet>

      {/* Interests Filter Modal */}
      <FilterBottomSheet
        isOpen={activeFilterModal === "interests"}
        onClose={() => setActiveFilterModal(null)}
        title="Interests"
        description="Find families and experiences matching your interests"
        onClear={() => setSelectedInterests([])}
        onApply={() => setActiveFilterModal(null)}
      >
        <div className="space-y-2">
          {INTERESTS.map((interest) => (
            <button
              key={interest}
              onClick={() => {
                setSelectedInterests(prev => 
                  prev.includes(interest) 
                    ? prev.filter(i => i !== interest)
                    : [...prev, interest]
                );
              }}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors",
                selectedInterests.includes(interest)
                  ? "bg-coral/20 text-coral"
                  : "bg-gray-800 text-white hover:bg-gray-700"
              )}
              data-testid={`filter-modal-interest-${interest.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <span className="font-medium">{interest}</span>
              <div className={cn(
                "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                selectedInterests.includes(interest)
                  ? "bg-coral border-coral"
                  : "border-gray-600"
              )}>
                {selectedInterests.includes(interest) && (
                  <Check className="h-3 w-3 text-white" />
                )}
              </div>
            </button>
          ))}
        </div>
      </FilterBottomSheet>

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
