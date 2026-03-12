import { ExperienceCard } from "@/components/shared/ExperienceCard";
import { ExploreMap, MapBounds } from "@/components/shared/ExploreMap";
import { GoogleMapsProvider, useGoogleMapsContext } from "@/components/shared/GoogleMapsProvider";
import { Search, Navigation, X, MapPin, Filter, Loader2, Users, Eye, EyeOff, Check, List, Map as MapIcon, ChevronDown, Calendar } from "lucide-react";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { formatExperience } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { User, Experience, Pod } from "@shared/schema";
import { BottomNav } from "@/components/layout/BottomNav";

type ViewMode = "map" | "list";

const CATEGORIES = ["All", "Outdoor", "Indoor", "Food", "Sports", "Arts", "Education", "Entertainment"];
const INTERESTS = ["Adventure", "Education", "Creativity", "Nature & Outdoors", "Arts & Culture", "Health & Wellness", "Community", "Quality Time"];

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

// Unified filter bottom sheet component
function UnifiedFilterSheet({
  isOpen,
  onClose,
  categoryFilter,
  setCategoryFilter,
  selectedInterests,
  setSelectedInterests,
  selectedPodFilter,
  setSelectedPodFilter,
  followingFilter,
  setFollowingFilter,
  showPeopleOnMap,
  setShowPeopleOnMap,
  userPods,
  resultCount,
}: {
  isOpen: boolean;
  onClose: () => void;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  selectedInterests: string[];
  setSelectedInterests: (v: string[]) => void;
  selectedPodFilter: number | "all";
  setSelectedPodFilter: (v: number | "all") => void;
  followingFilter: boolean;
  setFollowingFilter: (v: boolean) => void;
  showPeopleOnMap: boolean;
  setShowPeopleOnMap: (v: boolean) => void;
  userPods: Pod[];
  resultCount: number;
}) {
  const [podSearchQuery, setPodSearchQuery] = useState("");

  const filteredPods = useMemo(() => {
    const nonDirectPods = userPods.filter((p: Pod) => !p.isDirect);
    if (!podSearchQuery) return nonDirectPods;
    return nonDirectPods.filter((p: Pod) =>
      p.name.toLowerCase().includes(podSearchQuery.toLowerCase())
    );
  }, [userPods, podSearchQuery]);

  const clearAll = () => {
    setCategoryFilter("All");
    setSelectedInterests([]);
    setSelectedPodFilter("all");
    setFollowingFilter(false);
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[100]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[110] bg-background rounded-t-3xl max-h-[85vh] overflow-hidden border-t border-border"
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-border rounded-full" />
            </div>
            <div className="px-5 pb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Filters</h3>
                <button
                  onClick={clearAll}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="filter-clear-all"
                >
                  Clear all
                </button>
              </div>

              <div className="overflow-y-auto max-h-[60vh] space-y-6">
                {/* Categories */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">Categories</h4>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={cn(
                          "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                          categoryFilter === cat
                            ? "bg-foreground text-background"
                            : "bg-muted text-foreground hover:bg-muted/80"
                        )}
                        data-testid={`filter-category-${cat.toLowerCase()}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-border" />

                {/* Interests */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">Interests</h4>
                  <div className="space-y-2">
                    {INTERESTS.map((interest) => (
                      <button
                        key={interest}
                        onClick={() => {
                          setSelectedInterests(
                            selectedInterests.includes(interest)
                              ? selectedInterests.filter(i => i !== interest)
                              : [...selectedInterests, interest]
                          );
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors",
                          selectedInterests.includes(interest)
                            ? "bg-foreground/10 text-foreground"
                            : "bg-muted text-foreground hover:bg-muted/80"
                        )}
                        data-testid={`filter-interest-${interest.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <span className="font-medium">{interest}</span>
                        <div className={cn(
                          "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                          selectedInterests.includes(interest)
                            ? "bg-foreground border-foreground"
                            : "border-border"
                        )}>
                          {selectedInterests.includes(interest) && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-border" />

                {/* Pods */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">Pods</h4>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search pods..."
                      value={podSearchQuery}
                      onChange={(e) => setPodSearchQuery(e.target.value)}
                      className="w-full rounded-xl bg-muted py-3 pl-10 pr-4 text-foreground text-sm outline-none placeholder:text-muted-foreground border border-border focus:ring-2 focus:ring-primary/20"
                      data-testid="input-pod-search"
                    />
                  </div>
                  <div className="space-y-2">
                    <button
                      onClick={() => setSelectedPodFilter("all")}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors",
                        selectedPodFilter === "all"
                          ? "bg-foreground/10 text-foreground"
                          : "bg-muted text-foreground hover:bg-muted/80"
                      )}
                      data-testid="filter-pod-all"
                    >
                      <span className="font-medium">All Pods</span>
                      {selectedPodFilter === "all" && (
                        <div className="w-5 h-5 rounded-full bg-foreground flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </button>
                    {filteredPods.map((pod: Pod) => (
                      <button
                        key={pod.id}
                        onClick={() => setSelectedPodFilter(pod.id)}
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors",
                          selectedPodFilter === pod.id
                            ? "bg-foreground/10 text-foreground"
                            : "bg-muted text-foreground hover:bg-muted/80"
                        )}
                        data-testid={`filter-pod-${pod.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center">
                            <Users className="h-4 w-4 text-background" />
                          </div>
                          <span className="font-medium truncate">{pod.name}</span>
                        </div>
                        {selectedPodFilter === pod.id && (
                          <div className="w-5 h-5 rounded-full bg-foreground flex items-center justify-center flex-shrink-0">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                    {filteredPods.length === 0 && (
                      <div className="text-center py-4 text-muted-foreground">
                        {podSearchQuery ? "No pods match your search" : "You haven't joined any pods yet"}
                      </div>
                    )}
                  </div>
                </div>

                <div className="h-px bg-border" />

                {/* Toggles */}
                <div className="space-y-3">
                  <button
                    onClick={() => setFollowingFilter(!followingFilter)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
                    data-testid="filter-toggle-following"
                  >
                    <span className="font-medium text-foreground">Following only</span>
                    <div className={cn(
                      "w-11 h-6 rounded-full transition-colors relative",
                      followingFilter ? "bg-foreground" : "bg-border"
                    )}>
                      <div className={cn(
                        "absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform",
                        followingFilter ? "translate-x-[22px]" : "translate-x-0.5"
                      )} />
                    </div>
                  </button>

                  <button
                    onClick={() => setShowPeopleOnMap(!showPeopleOnMap)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
                    data-testid="filter-toggle-people"
                  >
                    <span className="font-medium text-foreground">Show People</span>
                    <div className={cn(
                      "w-11 h-6 rounded-full transition-colors relative",
                      showPeopleOnMap ? "bg-foreground" : "bg-border"
                    )}>
                      <div className={cn(
                        "absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform",
                        showPeopleOnMap ? "translate-x-[22px]" : "translate-x-0.5"
                      )} />
                    </div>
                  </button>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full mt-4 py-3 px-6 bg-foreground text-background font-medium rounded-full hover:bg-foreground/90 transition-colors"
                data-testid="filter-apply"
              >
                Show {resultCount} results
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

function ExploreInner() {
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const [showFilterSheet, setShowFilterSheet] = useState(false);

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
  const [followingFilter, setFollowingFilter] = useState(false);

  const [visibleBounds, setVisibleBounds] = useState<MapBounds | null>(null);

  const { location: userLocation } = useUserLocation();
  const { isLoaded: mapsLoaded } = useGoogleMapsContext();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Google Places autocomplete setup
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
          setShowSearchOverlay(false);
        }
      }
    );
  };

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

  const formattedExperiences = useMemo(() => experiencesInView.map(exp => ({
    ...formatExperience(exp as any),
    distance: 'distance' in exp ? (exp as any).distance : undefined,
  })), [experiencesInView]);

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

  // Pin tap handler — sets selected experience for bottom sheet
  const handlePinTap = useCallback((experience: Experience) => {
    setSelectedExperience(experience);
  }, []);

  return (
    <div className={cn(
      "fixed md:left-64 top-0 left-0 right-0 w-full md:w-auto overflow-hidden bg-muted",
      viewMode === "list" ? "bottom-0 z-10" : "bottom-0 z-30"
    )}>
      <div className="relative h-full md:flex">
        {/* Map layer — always rendered, hidden in list view on mobile */}
        <div className={cn(
          "absolute inset-0 h-full w-full md:relative md:flex-1",
          viewMode === "list" && "hidden md:block"
        )}>
          <ExploreMap
            experiences={filteredExperiences}
            userLocation={userLocation}
            searchLocation={searchLocation}
            people={showPeopleOnMap ? filteredExplorePeople : []}
            onBoundsChange={setVisibleBounds}
            onExperienceClick={handlePinTap}
          />
        </div>

        {/* Kindred-style Three-Part Search Bar */}
        <div className="absolute top-4 left-0 right-0 z-40 px-4 pt-safe">
          <div className="relative">
            <div className="flex items-center bg-card rounded-full shadow-lg border border-border overflow-hidden">
              {/* Search segment */}
              <button
                onClick={() => {
                  setShowSearchOverlay(!showSearchOverlay);
                }}
                className="flex-1 flex items-center gap-2.5 px-4 py-3.5 text-left min-w-0"
                data-testid="search-segment-location"
              >
                <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className={cn(
                  "text-sm font-medium truncate",
                  searchQuery ? "text-foreground" : "text-muted-foreground"
                )}>
                  {searchQuery || "Anywhere"}
                </span>
              </button>

              <div className="w-px h-8 bg-border" />

              {/* Date segment (placeholder) */}
              <button
                className="flex items-center gap-2 px-4 py-3.5 text-left"
                data-testid="search-segment-date"
              >
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Anytime</span>
              </button>

              <div className="w-px h-8 bg-border" />

              {/* Filter segment */}
              <button
                onClick={() => setShowFilterSheet(true)}
                className="flex items-center gap-2 px-4 py-3.5 relative"
                data-testid="search-segment-filter"
              >
                <Filter className="h-4 w-4 text-foreground" />
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-foreground text-background text-[10px] font-bold rounded-full flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>

            {/* Search clear button */}
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setSearchLocation(null); setShowSearchOverlay(false); }}
                className="absolute right-[7.5rem] top-1/2 -translate-y-1/2 rounded-full bg-muted p-1 z-10"
                data-testid="button-clear-search"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Search Overlay — shows when search segment is tapped */}
          <AnimatePresence>
            {showSearchOverlay && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="mt-2 rounded-xl bg-card shadow-lg overflow-hidden border border-border"
              >
                <div className="p-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search a destination..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (searchLocation) setSearchLocation(null);
                      }}
                      autoFocus
                      className="w-full rounded-xl bg-muted py-3 pl-10 pr-10 text-foreground text-sm outline-none placeholder:text-muted-foreground border border-border focus:ring-2 focus:ring-primary/20"
                      data-testid="input-search-main"
                    />
                    {isSearchingPlaces && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Place Predictions */}
                {placePredictions.length > 0 && (
                  <div className="border-t border-border">
                    {placePredictions.map((prediction) => (
                      <button
                        key={prediction.place_id}
                        onClick={() => handlePlaceSelect(prediction)}
                        className="w-full px-4 py-3 text-left hover:bg-muted flex items-start gap-3 border-b border-border last:border-0"
                        data-testid={`place-prediction-${prediction.place_id}`}
                      >
                        <MapPin className="h-5 w-5 text-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {prediction.structured_formatting.main_text}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {prediction.structured_formatting.secondary_text}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {searchQuery.length > 0 && placePredictions.length === 0 && !isSearchingPlaces && (
                  <div className="px-4 py-3 text-sm text-muted-foreground border-t border-border">
                    No places found
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Dismiss search overlay on outside tap */}
        {showSearchOverlay && (
          <div
            className="absolute inset-0 z-35"
            onClick={() => setShowSearchOverlay(false)}
          />
        )}

        {/* Map / List Toggle — bottom center on mobile */}
        <div className={cn(
          "absolute left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 md:hidden",
          viewMode === "list" ? "bottom-[calc(var(--bottom-nav-height,80px)+1rem)]" : "bottom-6"
        )}>
          {viewMode === "map" ? (
            <button
              onClick={() => setViewMode("list")}
              className="flex items-center gap-2 px-5 py-3 bg-foreground text-background rounded-full shadow-lg text-sm font-semibold active:scale-95 transition-transform"
              data-testid="toggle-list-view"
            >
              <List className="h-4 w-4" />
              List
            </button>
          ) : (
            <button
              onClick={() => setViewMode("map")}
              className="flex items-center gap-2 px-5 py-3 bg-foreground text-background rounded-full shadow-lg text-sm font-semibold active:scale-95 transition-transform"
              data-testid="toggle-map-view"
            >
              <MapIcon className="h-4 w-4" />
              Map
            </button>
          )}
        </div>

        {/* Result count pill — map view only, above toggle */}
        {viewMode === "map" && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 md:hidden">
            <div className="px-3 py-1.5 bg-card/90 backdrop-blur-sm rounded-full shadow-sm border border-border text-xs font-medium text-muted-foreground">
              {formattedExperiences.length} {formattedExperiences.length === 1 ? "experience" : "experiences"}
            </div>
          </div>
        )}

        {/* Mobile List View */}
        {viewMode === "list" && (
          <div className="absolute inset-0 z-20 bg-background overflow-y-auto pt-24 px-4 md:hidden" style={{ paddingBottom: 'calc(var(--bottom-nav-height, 80px) + 4rem)' }}>
            <div className="mb-4">
              <h3 className="font-heading text-lg font-bold text-foreground">
                {searchQuery ? `Results for "${searchQuery}"` : `${formattedExperiences.length} experiences`}
              </h3>
            </div>
            <div className="space-y-4">
              {loadingExperiences ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : formattedExperiences.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground mb-2">No experiences match your filters</div>
                  <button
                    onClick={clearAllFilters}
                    className="text-sm text-primary font-medium"
                    data-testid="button-reset-filters"
                  >
                    Reset filters
                  </button>
                </div>
              ) : (
                formattedExperiences.map((exp) => (
                  <ExperienceCard key={exp.id} experience={exp} className="shadow-none border border-border" />
                ))
              )}
            </div>
          </div>
        )}

        {/* Single Experience Bottom Sheet (pin tap) — mobile only */}
        <AnimatePresence>
          {selectedExperience && viewMode === "map" && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-40 md:hidden"
                onClick={() => setSelectedExperience(null)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.2}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 80) setSelectedExperience(null);
                }}
                className="absolute bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl shadow-[0_-4px_24px_rgba(0,0,0,0.12)] border-t border-border overflow-hidden md:hidden"
              >
                <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
                  <div className="h-1.5 w-12 rounded-full bg-border" />
                </div>
                <div
                  className="cursor-pointer"
                  onClick={() => setLocation(`/experience/${selectedExperience.id}`)}
                >
                  {/* Image */}
                  <div className="px-4 pb-3">
                    <img
                      src={selectedExperience.image}
                      alt={selectedExperience.title}
                      className="w-full h-44 object-cover rounded-2xl"
                    />
                  </div>

                  {/* Details */}
                  <div className="px-5 pb-6">
                    <h3 className="font-heading text-lg font-bold text-foreground mb-1">
                      {selectedExperience.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {selectedExperience.locationName}
                    </p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {selectedExperience.duration && (
                        <span>{selectedExperience.duration}</span>
                      )}
                      {selectedExperience.duration && selectedExperience.cost && (
                        <span>·</span>
                      )}
                      {selectedExperience.cost && (
                        <span className="text-foreground font-medium">{selectedExperience.cost}</span>
                      )}
                      {selectedExperience.ages && (
                        <>
                          <span>·</span>
                          <span>{selectedExperience.ages}</span>
                        </>
                      )}
                    </div>
                    <div className="mt-4 py-2.5 px-4 bg-muted rounded-full text-center">
                      <span className="text-sm font-semibold text-foreground">View details</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Desktop Side Panel */}
        <div className="hidden md:flex md:flex-col md:w-[400px] bg-background border-l border-border h-full overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="font-heading text-lg font-semibold text-foreground">
              {searchQuery ? `Results for "${searchQuery}"` : `${formattedExperiences.length} experiences in view`}
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {loadingExperiences ? (
              <div className="text-center py-4 text-muted-foreground">Loading...</div>
            ) : formattedExperiences.length === 0 ? (
              <div className="text-center py-4">
                <div className="text-muted-foreground mb-2">No experiences match your filters</div>
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-primary font-medium"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              formattedExperiences.map((exp) => (
                <ExperienceCard key={exp.id} experience={exp} className="shadow-none border border-border" />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Unified Filter Sheet */}
      <UnifiedFilterSheet
        isOpen={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        selectedInterests={selectedInterests}
        setSelectedInterests={setSelectedInterests}
        selectedPodFilter={selectedPodFilter}
        setSelectedPodFilter={setSelectedPodFilter}
        followingFilter={followingFilter}
        setFollowingFilter={setFollowingFilter}
        showPeopleOnMap={showPeopleOnMap}
        setShowPeopleOnMap={setShowPeopleOnMap}
        userPods={userPods}
        resultCount={formattedExperiences.length}
      />

      {/* Show BottomNav in list view only */}
      {viewMode === "list" && <BottomNav />}
    </div>
  );
}

export default function Explore() {
  return (
    <GoogleMapsProvider>
      <ExploreInner />
    </GoogleMapsProvider>
  );
}
